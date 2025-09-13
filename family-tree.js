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

    /**
     * Organizes family members into generations for tree visualization.
     * 
     * ALGORITHM OVERVIEW:
     * 1. Initial Assignment: Assign generations based on parent-child relationships
     * 2. Spouse Alignment: Post-process to ensure married couples are in the same generation
     * 
     * GENERATION ASSIGNMENT RULES:
     * - Root members (no parents) start in generation 0
     * - Children are placed in parent's generation + 1
     * - Spouses are initially placed in the same generation as their partner
     * - Post-processing fixes cases where spouses end up in different generations
     * 
     * SPECIAL CASE HANDLING:
     * - Members with no parents but married to someone with parents
     * - Example: Elisa Fraser (no parents) married to Luke Alexander Fraser (has parents)
     * - Solution: Move the spouse without parents to match their partner's generation
     * 
     * @returns {Map} Map of generation numbers to arrays of members in that generation
     */
    organizeByGeneration() {
        const generations = new Map();
        const visited = new Set();

        /**
         * Recursively assigns a member and their family to generations
         * @param {Object} member - The family member to assign
         * @param {number} gen - The generation number to assign
         */
        const assignGeneration = (member, gen = 0) => {
            if (visited.has(member.name)) return;
            visited.add(member.name);

            if (!generations.has(gen)) {
                generations.set(gen, []);
            }
            generations.get(gen).push(member);

            // Add children to next generation (preserves parent-child relationships)
            const children = this.members.filter(m => 
                m.father === member.name || m.mother === member.name
            );
            children.forEach(child => assignGeneration(child, gen + 1));

            // Add spouses to same generation (initial attempt - may need post-processing)
            if (member.spouses) {
                member.spouses.forEach(spouseName => {
                    const spouse = this.memberMap.get(spouseName);
                    if (spouse && !visited.has(spouse.name)) {
                        assignGeneration(spouse, gen);
                    }
                });
            }
        };

        // PHASE 1: Initial generation assignment based on parent-child relationships
        // Start with root members (no parents) - these form the foundation of the tree
        const rootMembers = this.members.filter(m => !m.father && !m.mother);
        rootMembers.forEach(member => assignGeneration(member));

        // Handle any orphaned members that weren't reached through the root traversal
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

        // ============================================================================
        // POST-PROCESSING: SPOUSE GENERATION ALIGNMENT
        // ============================================================================
        // This section fixes the issue where married couples end up in different 
        // generations due to the initial parent-child based generation assignment.
        //
        // PROBLEM SCENARIO:
        // - Elisa Fraser (no parents) gets assigned to generation 0 (root)
        // - Luke Alexander Fraser (has parents: Jamie Fraser) gets assigned to generation 1
        // - They are married but appear in different generations
        // - Their children get placed in generation 2, creating a gap
        //
        // SOLUTION:
        // We use intelligent rules to determine which generation is "correct" for both spouses
        // and move them to the same generation while preserving parent-child relationships.
        // ============================================================================
        
        // Create a mapping of member names to their current generation assignments
        const memberToGeneration = new Map();
        generations.forEach((members, gen) => {
            members.forEach(member => {
                memberToGeneration.set(member.name, gen);
            });
        });

        // Find and fix spouse generation mismatches
        this.members.forEach(member => {
            if (member.spouses) {
                member.spouses.forEach(spouseName => {
                    const spouse = this.memberMap.get(spouseName);
                    if (spouse) {
                        const memberGen = memberToGeneration.get(member.name);
                        const spouseGen = memberToGeneration.get(spouseName);
                        
                        // Only process if spouses are in different generations
                        if (memberGen !== undefined && spouseGen !== undefined && memberGen !== spouseGen) {
                            
                            // ========================================================================
                            // GENERATION SELECTION RULES
                            // ========================================================================
                            // Rule 1: One spouse has parents, the other doesn't
                            //   → Use the generation of the spouse who has parents
                            //   → This ensures family connections determine the correct generation
                            //   → Example: Elisa (no parents) + Luke (has parents) → Use Luke's generation
                            //
                            // Rule 2: Both spouses have parents OR both don't have parents
                            //   → Use the higher generation (more recent generation)
                            //   → This prevents moving people to older generations unnecessarily
                            //   → Example: Both have parents in different generations → Use the higher one
                            // ========================================================================
                            
                            let correctGen = memberGen;
                            
                            if ((member.father || member.mother) && !(spouse.father || spouse.mother)) {
                                // Member has parents, spouse doesn't → Use member's generation
                                correctGen = memberGen;
                            } else if (!(member.father || member.mother) && (spouse.father || spouse.mother)) {
                                // Spouse has parents, member doesn't → Use spouse's generation
                                correctGen = spouseGen;
                            } else {
                                // Both have parents or both don't have parents → Use higher generation
                                correctGen = Math.max(memberGen, spouseGen);
                            }
                            
                            // Move both spouses to the correct generation
                            [member, spouse].forEach(person => {
                                const currentGen = memberToGeneration.get(person.name);
                                if (currentGen !== correctGen) {
                                    // Remove from current generation
                                    const currentGenArray = generations.get(currentGen);
                                    if (currentGenArray) {
                                        const personIndex = currentGenArray.findIndex(m => m.name === person.name);
                                        if (personIndex !== -1) {
                                            currentGenArray.splice(personIndex, 1);
                                        }
                                    }
                                    
                                    // Add to correct generation
                                    if (!generations.has(correctGen)) {
                                        generations.set(correctGen, []);
                                    }
                                    generations.get(correctGen).push(person);
                                    memberToGeneration.set(person.name, correctGen);
                                }
                            });
                        }
                    }
                });
            }
        });

        return generations;
    }

    findMemberGeneration(member) {
        if (member.father || member.mother) {
            const fatherGen = this.getGenerationByName(member.father);
            const motherGen = this.getGenerationByName(member.mother);
            const calculatedGen = Math.max(fatherGen, motherGen) + 1;
            
            
            return calculatedGen;
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
        
        // Simple recursive generation calculation without calling organizeByGeneration
        const calculateGeneration = (memberName, visited = new Set()) => {
            if (visited.has(memberName)) return 0; // Avoid infinite loops
            visited.add(memberName);
            
            const member = this.memberMap.get(memberName);
            if (!member) return -1;
            
            if (member.father || member.mother) {
                const fatherGen = member.father ? calculateGeneration(member.father, visited) : -1;
                const motherGen = member.mother ? calculateGeneration(member.mother, visited) : -1;
                return Math.max(fatherGen, motherGen) + 1;
            }
            
            return 0;
        };
        
        return calculateGeneration(name);
    }

    calculatePositions(generations) {
        const positions = new Map();
        const GENERATION_HEIGHT = 200;
        const MEMBER_SPACING = 300;
        const FAMILY_SPACING = 20; // Extra spacing between family groups (very small)
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

        // Second pass: identify family groups and add spacing between them
        this.addFamilyGroupSpacing(positions, sortedGenerations, FAMILY_SPACING);

        // Third pass: improved centering - work from youngest to oldest
        // Use multiple iterations for better convergence
        for (let iteration = 0; iteration < 3; iteration++) {
            for (let i = sortedGenerations.length - 1; i >= 0; i--) {
                const genNum = sortedGenerations[i];
                const genMembers = generations.get(genNum);
                
                genMembers.forEach(member => {
                    this.centerMemberOverChildren(member, positions);
                });
            }
        }

        // Fourth pass: handle spouses - position them next to their partners
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

        // Fifth pass: final centering and spacing adjustments
        this.centerAndSpaceTree(positions, sortedGenerations, MEMBER_SPACING);

        return positions;
    }

    /**
     * Identifies family groups and adds extra spacing between them
     */
    addFamilyGroupSpacing(positions, sortedGenerations, familySpacing) {
        // Find root members (no parents) - these are the heads of family groups
        const rootMembers = this.members.filter(m => !m.father && !m.mother);
        
        console.log(`🔍 Family spacing debug: Found ${rootMembers.length} root members:`, rootMembers.map(r => r.name));
        
        if (rootMembers.length <= 1) {
            console.log('🔍 Only one family group, no spacing needed');
            return; // No need for spacing if only one family group
        }
        
        // Group connected root members together (they might be married or otherwise connected)
        const familyGroups = this.groupConnectedRoots(rootMembers);
        
        console.log(`🔍 After grouping connected roots: ${familyGroups.length} distinct family groups`);
        familyGroups.forEach((group, index) => {
            console.log(`🔍 Family group ${index + 1}: ${group.length} root members, ${group.reduce((sum, root) => sum + this.getAllDescendants(root).length, 0)} total members`);
        });
        
        // Calculate spacing between family groups
        let currentX = 0;
        const groupSpacing = familySpacing;
        
        console.log(`🔍 Starting family group positioning with spacing: ${groupSpacing}px`);
        
        familyGroups.forEach((rootGroup, groupIndex) => {
            // Get all descendants from all roots in this group
            const allDescendants = new Set();
            rootGroup.forEach(root => {
                const descendants = this.getAllDescendants(root);
                descendants.forEach(desc => allDescendants.add(desc));
            });
            
            const groupPositions = Array.from(allDescendants)
                .map(desc => positions.get(desc.name))
                .filter(pos => pos !== undefined);
            
            if (groupPositions.length > 0) {
                const minGroupX = Math.min(...groupPositions.map(pos => pos.x));
                const maxGroupX = Math.max(...groupPositions.map(pos => pos.x));
                const groupWidth = maxGroupX - minGroupX;
                
                console.log(`🔍 Family group ${groupIndex + 1}: minX=${minGroupX}, maxX=${maxGroupX}, width=${groupWidth}, currentX=${currentX}`);
                
                // Position this family group
                const offset = currentX - minGroupX;
                console.log(`🔍 Applying offset ${offset} to ${groupPositions.length} positions`);
                
                groupPositions.forEach(pos => {
                    pos.x += offset;
                });
                
                // Move to next position for next family group
                currentX += groupWidth + groupSpacing;
                console.log(`🔍 Next family will start at X=${currentX}`);
            }
        });
        
        console.log(`🔍 Family spacing complete. Final tree width: ${currentX - groupSpacing}px`);
    }
    
    /**
     * Groups connected root members together (married couples, etc.)
     */
    groupConnectedRoots(rootMembers) {
        const groups = [];
        const visited = new Set();
        
        rootMembers.forEach(root => {
            if (visited.has(root.name)) return;
            
            const group = [];
            const queue = [root];
            
            while (queue.length > 0) {
                const current = queue.shift();
                if (visited.has(current.name)) continue;
                
                visited.add(current.name);
                group.push(current);
                
                // Add spouses who are also root members
                if (current.spouses) {
                    current.spouses.forEach(spouseName => {
                        const spouse = this.memberMap.get(spouseName);
                        if (spouse && !spouse.father && !spouse.mother && !visited.has(spouseName)) {
                            queue.push(spouse);
                        }
                    });
                }
            }
            
            if (group.length > 0) {
                groups.push(group);
            }
        });
        
        return groups;
    }
    
    /**
     * Gets all descendants of a given member
     */
    getAllDescendants(member) {
        const descendants = new Set([member]);
        const queue = [member];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const children = this.members.filter(m => 
                m.father === current.name || m.mother === current.name
            );
            
            children.forEach(child => {
                if (!descendants.has(child)) {
                    descendants.add(child);
                    queue.push(child);
                }
            });
        }
        
        return Array.from(descendants);
    }
    
    /**
     * Centers a member over their children with improved algorithm
     */
    centerMemberOverChildren(member, positions) {
        const children = this.members.filter(m => 
            m.father === member.name || m.mother === member.name
        );
        
        if (children.length === 0) return;
        
        // Get positions of all children
        const childPositions = children
            .map(child => positions.get(child.name))
            .filter(pos => pos !== undefined);
        
        if (childPositions.length === 0) return;
        
        // Calculate the center position
        const centerX = childPositions.reduce((sum, pos) => sum + pos.x, 0) / childPositions.length;
        
        // For married couples, center both parents over their children
        if (member.spouses && member.spouses.length > 0) {
            const spouse = this.memberMap.get(member.spouses[0]);
            if (spouse) {
                const spousePos = positions.get(spouse.name);
                if (spousePos) {
                    // Position both parents centered over children
                    const parentSpacing = 150; // Space between married parents
                    positions.set(member.name, { 
                        x: centerX - parentSpacing / 2, 
                        y: positions.get(member.name).y, 
                        member: member 
                    });
                    positions.set(spouse.name, { 
                        x: centerX + parentSpacing / 2, 
                        y: spousePos.y, 
                        member: spouse 
                    });
                    return;
                }
            }
        }
        
        // Single parent - center directly over children
        positions.set(member.name, { 
            x: centerX, 
            y: positions.get(member.name).y, 
            member: member 
        });
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
