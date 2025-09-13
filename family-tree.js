// Family Tree implementation using D3.js
class FamilyTree {
    constructor() {
        this.members = [];
        this.memberMap = new Map();
        this.tooltip = document.getElementById('tooltip');
        this.loading = document.getElementById('loading');
        this.treeContainer = document.getElementById('tree');
        this.width = window.innerWidth;
        this.height = window.innerHeight - 80;
        
        this.init();
    }

    async init() {
        try {
            await this.loadFamilyData();
            this.createTree();
            this.loading.style.display = 'none';
        } catch (error) {
            console.error('Error initializing family tree:', error);
            this.loading.innerHTML = `
                <div class="spinner"></div>
                Error loading family tree: ${error.message}
            `;
        }
    }

    async loadFamilyData() {
        try {
            const response = await fetch('data/members.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.members = await response.json();
            this.memberMap = new Map(this.members.map(member => [member.name, member]));
        } catch (error) {
            console.error('Error loading family data:', error);
            throw error;
        }
    }

    createTree() {
        // Clear existing content
        d3.select(this.treeContainer).selectAll("*").remove();

        // Create SVG
        const svg = d3.select(this.treeContainer)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .call(d3.zoom().on("zoom", (event) => {
                g.attr("transform", event.transform);
            }));

        const g = svg.append("g");

        // Organize members by generation
        const generations = this.organizeByGeneration();
        
        // Position members
        const positions = this.calculatePositions(generations);
        
        // Draw connections
        this.drawConnections(g, positions);
        
        // Draw nodes
        this.drawNodes(g, positions);
    }

    organizeByGeneration() {
        const generations = new Map();
        const visited = new Set();

        const assignGeneration = (member, gen = 0) => {
            if (visited.has(member.name)) return;
            visited.add(member.name);

            if (!generations.has(gen)) {
                generations.set(gen, []);
            }
            generations.get(gen).push(member);

            // Add children to next generation
            const children = this.members.filter(m => 
                m.father === member.name || m.mother === member.name
            );
            children.forEach(child => assignGeneration(child, gen + 1));

            // Add spouses to same generation
            if (member.spouses) {
                member.spouses.forEach(spouseName => {
                    const spouse = this.memberMap.get(spouseName);
                    if (spouse && !visited.has(spouse.name)) {
                        assignGeneration(spouse, gen);
                    }
                });
            }
        };

        // Start with root members (no parents)
        const rootMembers = this.members.filter(m => !m.father && !m.mother);
        rootMembers.forEach(member => assignGeneration(member));

        // Handle orphaned members
        this.members.forEach(member => {
            if (!visited.has(member.name)) {
                const gen = this.findMemberGeneration(member);
                if (!generations.has(gen)) {
                    generations.set(gen, []);
                }
                generations.get(gen).push(member);
                visited.add(member.name);
            }
        });

        return generations;
    }

    findMemberGeneration(member) {
        if (member.father || member.mother) {
            const fatherGen = this.getGenerationByName(member.father);
            const motherGen = this.getGenerationByName(member.mother);
            return Math.max(fatherGen, motherGen) + 1;
        }

        // Try to find through spouse
        if (member.spouses) {
            for (const spouseName of member.spouses) {
                const spouseGen = this.getGenerationByName(spouseName);
                if (spouseGen !== -1) {
                    return spouseGen;
                }
            }
        }

        return 0;
    }

    getGenerationByName(name) {
        if (!name) return -1;
        
        for (const [gen, members] of this.organizeByGeneration()) {
            if (members.some(m => m.name === name)) {
                return gen;
            }
        }
        return -1;
    }

    calculatePositions(generations) {
        const positions = new Map();
        const GENERATION_HEIGHT = 200; // Increased spacing
        const MEMBER_SPACING = 300; // Increased spacing
        const START_Y = 100;

        // Sort generations from oldest to youngest
        const sortedGenerations = Array.from(generations.keys()).sort((a, b) => a - b);
        
        // First pass: position all members with basic spacing
        sortedGenerations.forEach(genNum => {
            const genMembers = generations.get(genNum);
            if (genMembers.length === 0) return;

            genMembers.forEach((member, i) => {
                const x = i * MEMBER_SPACING; // Temporary position
                const y = START_Y + genNum * GENERATION_HEIGHT;
                positions.set(member.name, { x, y, member });
            });
        });

        // Second pass: adjust positions to center parents over children
        // Work from youngest generation to oldest
        for (let i = sortedGenerations.length - 1; i >= 0; i--) {
            const genNum = sortedGenerations[i];
            const genMembers = generations.get(genNum);
            
            genMembers.forEach(member => {
                const children = this.members.filter(m => 
                    m.father === member.name || m.mother === member.name
                );
                
                if (children.length > 0) {
                    // Calculate center position of children
                    const childPositions = children
                        .map(child => positions.get(child.name))
                        .filter(pos => pos !== undefined);
                    
                    if (childPositions.length > 0) {
                        const centerX = childPositions.reduce((sum, pos) => sum + pos.x, 0) / childPositions.length;
                        positions.set(member.name, { 
                            x: centerX, 
                            y: positions.get(member.name).y, 
                            member: member 
                        });
                    }
                }
            });
        }

        // Third pass: handle spouses - position them next to their partners
        sortedGenerations.forEach(genNum => {
            const genMembers = generations.get(genNum);
            
            genMembers.forEach(member => {
                if (member.spouses && member.spouses.length > 0) {
                    const memberPos = positions.get(member.name);
                    let spouseOffset = 0;
                    
                    member.spouses.forEach(spouseName => {
                        const spouse = this.memberMap.get(spouseName);
                        if (spouse) {
                            const spousePos = positions.get(spouseName);
                            if (spousePos && spousePos.x === memberPos.x) {
                                // Spouse is at same position, offset them
                                spouseOffset += MEMBER_SPACING / 2;
                                positions.set(spouseName, {
                                    x: memberPos.x + spouseOffset,
                                    y: spousePos.y,
                                    member: spouse
                                });
                            }
                        }
                    });
                }
            });
        });

        // Fourth pass: center the entire tree and ensure minimum spacing
        this.centerAndSpaceTree(positions, sortedGenerations, MEMBER_SPACING);

        return positions;
    }

    centerAndSpaceTree(positions, sortedGenerations, MEMBER_SPACING) {
        // Find the bounds of all positioned members
        let minX = Infinity, maxX = -Infinity;
        positions.forEach(pos => {
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.x);
        });

        // Calculate center offset to center the tree
        const treeWidth = maxX - minX;
        const centerOffset = (this.width - treeWidth) / 2 - minX;

        // Apply center offset to all positions
        positions.forEach(pos => {
            pos.x += centerOffset;
        });

        // Ensure minimum spacing between members in each generation
        sortedGenerations.forEach(genNum => {
            const genMembers = Array.from(positions.values())
                .filter(pos => pos.y === positions.get(Array.from(positions.keys())[0]).y + genNum * 200)
                .sort((a, b) => a.x - b.x);

            for (let i = 1; i < genMembers.length; i++) {
                const prevPos = genMembers[i - 1];
                const currPos = genMembers[i];
                const minDistance = MEMBER_SPACING;

                if (currPos.x - prevPos.x < minDistance) {
                    currPos.x = prevPos.x + minDistance;
                }
            }
        });
    }

    drawConnections(g, positions) {
        const drawnMarriages = new Set();
        const drawnParentChild = new Set();
        let marriageCount = 0;
        let parentChildCount = 0;

        this.members.forEach(member => {
            const memberPos = positions.get(member.name);
            if (!memberPos) return;
            
            // Debug specific member
            if (member.name === 'Falcon Sanchez') {
                console.log('🔍 Debugging Falcon Sanchez:', {
                    name: member.name,
                    father: member.father,
                    mother: member.mother,
                    spouses: member.spouses,
                    hasPosition: !!memberPos
                });
            }

            // Marriage connections
            if (member.spouses) {
                member.spouses.forEach(spouseName => {
                    const spouse = this.memberMap.get(spouseName);
                    if (spouse) {
                        const spousePos = positions.get(spouseName);
                        if (spousePos) {
                            const marriageKey = [member.name, spouseName].sort().join('-');
                            if (!drawnMarriages.has(marriageKey)) {
                                this.drawMarriageLine(g, memberPos, spousePos);
                                drawnMarriages.add(marriageKey);
                                marriageCount++;
                                console.log(`Marriage line: ${member.name} ↔ ${spouseName}`);
                                
                                // Debug Falcon Sanchez marriage
                                if (member.name === 'Falcon Sanchez' || spouseName === 'Falcon Sanchez') {
                                    console.log(`🔍 Falcon Sanchez marriage line drawn:`, {
                                        from: member.name,
                                        to: spouseName,
                                        fromPos: memberPos,
                                        toPos: spousePos,
                                        marriageKey: marriageKey,
                                        coordinates: `(${memberPos.x}, ${memberPos.y}) → (${spousePos.x}, ${spousePos.y})`
                                    });
                                }
                            } else {
                                console.log(`⚠️ Marriage line already drawn: ${marriageKey}`);
                            }
                        }
                    }
                });
            }

            // Parent-child connections - only draw lines to parents who exist in the tree
            const parentChildKey = member.name;
            if (!drawnParentChild.has(parentChildKey)) {
                
                // Debug children of Falcon Sanchez
                if (member.father === 'Falcon Sanchez' || member.mother === 'Falcon Sanchez') {
                    console.log(`🔍 Child of Falcon Sanchez: ${member.name}`, {
                        father: member.father,
                        mother: member.mother,
                        fatherExists: !!this.memberMap.get(member.father),
                        motherExists: !!this.memberMap.get(member.mother)
                    });
                }
                let hasValidParent = false;
                
                // If child has both parents, draw line from marriage midpoint
                if (member.father && member.mother) {
                    const father = this.memberMap.get(member.father);
                    const mother = this.memberMap.get(member.mother);
                    if (father && mother) {
                        const fatherPos = positions.get(member.father);
                        const motherPos = positions.get(member.mother);
                        if (fatherPos && motherPos) {
                            // Calculate midpoint of marriage line
                            const marriageMidpoint = {
                                x: (fatherPos.x + motherPos.x) / 2,
                                y: (fatherPos.y + motherPos.y) / 2
                            };
                            // Draw line from marriage midpoint to child
                            this.drawParentChildLine(g, marriageMidpoint, memberPos, member);
                            parentChildCount++;
                            console.log(`Parent-child line: marriage midpoint → ${member.name}`);
                            drawnParentChild.add(parentChildKey);
                            hasValidParent = true;
                        }
                    }
                }
                // If child has only father, draw line to father (only if father exists in tree)
                else if (member.father) {
                    const father = this.memberMap.get(member.father);
                    if (father) {
                        const fatherPos = positions.get(member.father);
                        if (fatherPos) {
                            this.drawParentChildLine(g, fatherPos, memberPos, member);
                            parentChildCount++;
                            console.log(`Parent-child line: ${member.father} → ${member.name}`);
                            drawnParentChild.add(parentChildKey);
                            hasValidParent = true;
                        }
                    }
                }
                // If child has only mother, draw line to mother (only if mother exists in tree)
                else if (member.mother) {
                    const mother = this.memberMap.get(member.mother);
                    if (mother) {
                        const motherPos = positions.get(member.mother);
                        if (motherPos) {
                            this.drawParentChildLine(g, motherPos, memberPos, member);
                            parentChildCount++;
                            console.log(`Parent-child line: ${member.mother} → ${member.name}`);
                            drawnParentChild.add(parentChildKey);
                            hasValidParent = true;
                        }
                    }
                }
                
                // Log if someone has parent names but parents don't exist in tree
                if ((member.father || member.mother) && !hasValidParent) {
                    console.log(`⚠️ ${member.name} has parents listed but they don't exist in tree:`, {
                        father: member.father,
                        mother: member.mother,
                        fatherExists: !!this.memberMap.get(member.father),
                        motherExists: !!this.memberMap.get(member.mother)
                    });
                }
            }
        });

        console.log(`Total lines drawn: ${marriageCount} marriages, ${parentChildCount} parent-child connections`);
        
        // Debug: Count all actual SVG lines
        const allLines = g.selectAll('line').nodes();
        console.log(`🔍 Total SVG lines in DOM: ${allLines.length}`);
        
        // Debug: List all line IDs
        allLines.forEach((line, index) => {
            const id = line.getAttribute('id');
            const x1 = line.getAttribute('x1');
            const y1 = line.getAttribute('y1');
            const x2 = line.getAttribute('x2');
            const y2 = line.getAttribute('y2');
            console.log(`Line ${index + 1}: ID="${id}" (${x1},${y1}) → (${x2},${y2})`);
        });
    }

    drawMarriageLine(g, pos1, pos2) {
        const lineId = `marriage-${pos1.x}-${pos1.y}-${pos2.x}-${pos2.y}`;
        console.log(`🎨 Drawing marriage line: (${pos1.x}, ${pos1.y}) → (${pos2.x}, ${pos2.y}) [ID: ${lineId}]`);
        
        // Create orthogonal path: horizontal line from pos1, then vertical line to pos2
        const midX = (pos1.x + pos2.x) / 2;
        const pathData = `M ${pos1.x} ${pos1.y} L ${midX} ${pos1.y} L ${midX} ${pos2.y} L ${pos2.x} ${pos2.y}`;
        
        g.append('path')
            .attr('id', lineId)
            .attr('class', 'link marriage')
            .attr('d', pathData)
            .style('stroke', '#d53f8c')
            .style('stroke-width', 3)
            .style('opacity', 0.7)
            .style('fill', 'none');
    }

    drawParentChildLine(g, parentPos, childPos, childMember) {
        const lineId = `parent-child-${parentPos.x}-${parentPos.y}-${childPos.x}-${childPos.y}-${childMember.name}`;
        console.log(`🎨 Drawing parent-child line: (${parentPos.x}, ${parentPos.y}) → (${childPos.x}, ${childPos.y}) for ${childMember.name} [ID: ${lineId}]`);
        
        // Create orthogonal path: vertical line from parent, then horizontal line to child
        const midY = (parentPos.y + childPos.y) / 2;
        const pathData = `M ${parentPos.x} ${parentPos.y} L ${parentPos.x} ${midY} L ${childPos.x} ${midY} L ${childPos.x} ${childPos.y}`;
        
        g.append('path')
            .attr('id', lineId)
            .attr('class', 'link parent-child')
            .attr('d', pathData)
            .style('stroke', '#3182ce')
            .style('stroke-width', 2)
            .style('opacity', 0.7)
            .style('fill', 'none');
    }

    drawNodes(g, positions) {
        const nodeGroup = g.selectAll('.node')
            .data(Array.from(positions.values()))
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Add node rectangles with better styling
        nodeGroup.append('rect')
            .attr('width', 200)
            .attr('height', 70)
            .attr('x', -100)
            .attr('y', -35)
            .attr('rx', 10)
            .attr('ry', 10)
            .style('fill', d => this.getNodeColor(d.member))
            .style('stroke', d => this.getNodeStroke(d.member))
            .style('stroke-width', d => this.getNodeStrokeWidth(d.member))
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => this.showTooltip(d.member, event))
            .on('mouseout', () => this.hideTooltip())
            .on('click', (event, d) => this.showDetailedTooltip(d.member, event));

        // Add node text with better styling
        nodeGroup.append('text')
            .attr('class', 'name-text')
            .attr('dy', -8)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', d => this.getTextColor(d.member))
            .text(d => d.member.name);

        nodeGroup.append('text')
            .attr('class', 'age-text')
            .attr('dy', 8)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', '#4a5568')
            .text(d => d.member.age || 'Unknown');

        nodeGroup.append('text')
            .attr('class', 'location-text')
            .attr('dy', 22)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#718096')
            .style('font-style', 'italic')
            .text(d => d.member.location || 'Unknown');
    }

    getNodeColor(member) {
        if (member.cause_of_death) {
            return '#f7fafc'; // Deceased - very light gray
        }
        if (member.gender === 'Male') {
            return '#ebf8ff'; // Male - very light blue
        }
        if (member.gender === 'Female') {
            return '#fdf2f8'; // Female - very light pink
        }
        return '#f7fafc'; // Unknown - light gray
    }

    getTextColor(member) {
        if (member.cause_of_death) {
            return '#718096'; // Deceased - gray text
        }
        if (member.gender === 'Male') {
            return '#2c5282'; // Male - dark blue text
        }
        if (member.gender === 'Female') {
            return '#97266d'; // Female - dark pink text
        }
        return '#4a5568'; // Unknown - gray text
    }

    getNodeStroke(member) {
        if (member.cause_of_death) {
            return '#718096'; // Deceased - gray
        }
        if (member.gender === 'Male') {
            return '#3182ce'; // Male - blue
        }
        if (member.gender === 'Female') {
            return '#d53f8c'; // Female - pink
        }
        return '#a0aec0'; // Unknown - gray
    }

    getNodeStrokeWidth(member) {
        if (member.age === 'Infant') return 1;
        if (member.age === 'Toddler') return 1;
        if (member.age === 'Child') return 2;
        if (member.age === 'Teen') return 2;
        if (member.age === 'Young Adult') return 3;
        if (member.age === 'Adult') return 3;
        if (member.age === 'Elder') return 4;
        return 2;
    }

    showTooltip(member, event) {
        // Find children
        const children = this.members.filter(m => 
            m.father === member.name || m.mother === member.name
        );

        console.log(`Showing tooltip for ${member.name}:`, {
            father: member.father,
            mother: member.mother,
            spouses: member.spouses,
            children: children.map(c => c.name)
        });

        this.tooltip.style.display = 'block';
        this.tooltip.innerHTML = `
            <div class="tooltip-name">${member.name}</div>
            <div class="tooltip-field">
                <span class="tooltip-label">Age:</span> 
                <span class="tooltip-value">${member.age || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Gender:</span> 
                <span class="tooltip-value">${member.gender || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Location:</span> 
                <span class="tooltip-value">${member.location || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Father:</span> 
                <span class="tooltip-value">${member.father || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Mother:</span> 
                <span class="tooltip-value">${member.mother || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Spouse(s):</span> 
                <span class="tooltip-value">${member.spouses?.length ? member.spouses.join(', ') : 'None'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Children (${children.length}):</span> 
                <span class="tooltip-value">${children.length ? children.map(c => c.name).join(', ') : 'None'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Status:</span> 
                <span class="tooltip-value">${member.cause_of_death || 'Alive'}</span>
            </div>
        `;
        
        this.updateTooltipPosition(event);
    }

    showDetailedTooltip(member, event) {
        this.tooltip.style.display = 'block';
        this.tooltip.innerHTML = `
            <div class="tooltip-name">${member.name}</div>
            <div class="tooltip-field">
                <span class="tooltip-label">Age:</span> 
                <span class="tooltip-value">${member.age || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Gender:</span> 
                <span class="tooltip-value">${member.gender || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Location:</span> 
                <span class="tooltip-value">${member.location || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Occupation:</span> 
                <span class="tooltip-value">${member.occupation || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Aspiration:</span> 
                <span class="tooltip-value">${member.aspiration || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Spouse(s):</span> 
                <span class="tooltip-value">${member.spouses?.length ? member.spouses.join(', ') : 'None'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Father:</span> 
                <span class="tooltip-value">${member.father || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Mother:</span> 
                <span class="tooltip-value">${member.mother || 'Unknown'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Extra Info:</span> 
                <span class="tooltip-value">${member.extra_information || 'None'}</span>
            </div>
            <div class="tooltip-field">
                <span class="tooltip-label">Cause of Death:</span> 
                <span class="tooltip-value">${member.cause_of_death || 'Alive'}</span>
            </div>
        `;
        this.updateTooltipPosition(event);
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    updateTooltipPosition(event) {
        if (!event) return;
        
        const x = event.clientX + 10;
        const y = event.clientY - 10;
        
        // Keep tooltip within viewport
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let finalX = x;
        let finalY = y;
        
        if (x + tooltipRect.width > viewportWidth) {
            finalX = event.clientX - tooltipRect.width - 10;
        }
        
        if (y < 0) {
            finalY = 10;
        }
        
        this.tooltip.style.left = `${finalX}px`;
        this.tooltip.style.top = `${finalY}px`;
    }
}

// Global functions for control buttons
function resetZoom() {
    if (window.familyTree) {
        window.familyTree.createTree();
    }
}

function centerTree() {
    if (window.familyTree) {
        window.familyTree.createTree();
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function showDebugInfo() {
    if (window.familyTree) {
        console.log('=== FAMILY TREE DEBUG INFO ===');
        console.log('Total members:', window.familyTree.members.length);
        
        // Count relationships
        let totalMarriages = 0;
        let totalParentChild = 0;
        
        window.familyTree.members.forEach(member => {
            if (member.spouses && member.spouses.length > 0) {
                totalMarriages += member.spouses.length;
            }
            if (member.father) totalParentChild++;
            if (member.mother) totalParentChild++;
        });
        
        console.log('Total marriages:', totalMarriages);
        console.log('Total parent-child relationships:', totalParentChild);
        console.log('Expected total lines:', totalMarriages + totalParentChild);
        
        // Show generation breakdown
        const generations = window.familyTree.organizeByGeneration();
        console.log('Generations:', generations.size);
        generations.forEach((members, gen) => {
            console.log(`Generation ${gen}: ${members.length} members`);
        });
        
        // Test tooltip with first member
        const firstMember = window.familyTree.members[0];
        if (firstMember) {
            console.log('Testing tooltip with first member:', firstMember.name);
            window.familyTree.showTooltip(firstMember, { clientX: 100, clientY: 100 });
        }
        
        alert(`Debug info logged to console!\n\nTotal members: ${window.familyTree.members.length}\nExpected lines: ${totalMarriages + totalParentChild}\nGenerations: ${generations.size}\n\nCheck browser console (F12) for detailed info.`);
    }
}

// Initialize the family tree when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.familyTree = new FamilyTree();
});
