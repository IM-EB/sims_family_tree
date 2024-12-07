class FamilyTree:
    def __init__(self):
        """
        Initialize an empty family tree.
        The tree will be stored as a dictionary of people,
        with each person having a unique identifier.
        """
        self.members = {}
        self.relationships = {}

    def add_member(
        self,
        name=None,
        age=None,
        gender=None,
        location=None,
        occupation=None,
        aspiration=None,
        cause_of_death=None,
        extra_information=None,
    ):
        """
        Add a new member to the family tree.

        :param name: Full name of the person (optional)
        :param age: Age of the person as integer (optional)
        :param gender: Gender of the person (one of "Male", "Female", "Alien", "Other") (optional)
        :param location: Location of the person (optional)
        :param occupation: Occupation of the person (optional)
        :param aspiration: Life aspiration of the person (optional)
        :param cause_of_death: Cause of death if applicable (optional)
        :param extra_information: Any additional information (optional)
        :return: Unique identifier for the new member
        """
        # Generate a unique identifier
        member_id = len(self.members) + 1

        # Validate and convert gender to title case if provided
        valid_genders = ["Male", "Female", "Alien", "Other"]
        if gender:
            gender = gender.title()
            if gender not in valid_genders:
                raise ValueError(f"Gender must be one of: {', '.join(valid_genders)}")

        # Convert age to integer if provided
        if age is not None:
            try:
                age = int(float(age))  # Handle both string and float inputs
                if age < 0:
                    raise ValueError("Age cannot be negative")
            except ValueError as e:
                if str(e) == "Age cannot be negative":
                    raise
                raise ValueError("Age must be a valid integer")

        # Create member dictionary
        member = {
            "id": member_id,
            "name": name,
            "age": age,
            "gender": gender,
            "location": location,
            "occupation": occupation,
            "aspiration": aspiration,
            "cause_of_death": cause_of_death,
            "extra_information": extra_information,
        }

        # Store the member
        self.members[member_id] = member

        return member_id

    def add_relationship(self, person1_id, person2_id, relationship_type):
        """
        Add a relationship between two family members.

        :param person1_id: ID of the first person
        :param person2_id: ID of the second person
        :param relationship_type: Type of relationship (e.g., 'parent', 'spouse', 'sibling')
        """
        if person1_id not in self.members or person2_id not in self.members:
            raise ValueError("One or both persons not found in the family tree")

        # Initialize relationships list if not exists
        if person1_id not in self.relationships:
            self.relationships[person1_id] = []

        # Add relationship
        self.relationships[person1_id].append(
            {"person_id": person2_id, "relationship_type": relationship_type}
        )

    def get_member(self, member_id):
        """
        Retrieve a member's details by their ID.

        :param member_id: ID of the member
        :return: Dictionary with member details
        """
        return self.members.get(member_id)

    def get_relationships(self, member_id):
        """
        Get all relationships for a specific member.

        :param member_id: ID of the member
        :return: List of relationships
        """
        return self.relationships.get(member_id, [])

    def print_family_tree(self):
        """
        Print out the entire family tree in a readable format.
        """
        print("Family Tree:")
        for member_id, member in self.members.items():
            print(f"\nMember ID {member_id}:")

            # Print member details
            fields = [
                ("Name", "name"),
                ("Age", "age"),
                ("Gender", "gender"),
                ("Location", "location"),
                ("Occupation", "occupation"),
                ("Aspiration", "aspiration"),
                ("Cause of Death", "cause_of_death"),
                ("Extra Information", "extra_information"),
            ]

            for label, field in fields:
                if member[field] is not None:
                    print(f"{label}: {member[field]}")

            # Print relationships
            relationships = self.get_relationships(member_id)
            if relationships:
                print("Relationships:")
                for rel in relationships:
                    related_member = self.get_member(rel["person_id"])
                    related_name = (
                        related_member["name"]
                        if related_member["name"]
                        else f"Member {rel['person_id']}"
                    )
                    print(f"  {rel['relationship_type']}: {related_name}")


# Example usage
def create_family_tree():
    # Create a family tree
    family =      FamilyTree()

    # Add some family members with the new metadata structure
    grandpa_id = 
    family.add_member(
        name="Ben Roberson",
        age=65,
        gender="Male",
        location="New York",
        occupation="Retired Doctor",
        aspiration="Travel the world",
        extra_information="Loves gardening",
    )

    grandma_id = family.add_member(
        name="Brooke Roberson",
        age=63,
        gender="Female",
        location="New York",
        occupation="Retired Teacher",
        aspiration="Write a book",
        extra_information="Expert baker",
    )

    dad_id = family.add_member(
        name="Robert Smith",
        age=42,
        gender="Male",
        location="Boston",
        occupation="Software Engineer",
        aspiration="Start a company",
    )

    mom_id = family.add_member(
        name="Sarah Smith",
        age=40,
        gender="Female",
        location="Boston",
        occupation="Doctor",
        aspiration="Open a clinic",
    )

    child1_id = family.add_member(
        name="Emma Smith",
        age=18,
        gender="Female",
        location="Boston",
        occupation="Student",
        aspiration="Become an artist",
    )

    # Add relationships
    family.add_relationship(grandpa_id, grandma_id, "spouse")
    family.add_relationship(grandpa_id, dad_id, "parent")
    family.add_relationship(grandma_id, dad_id, "parent")
    family.add_relationship(dad_id, mom_id, "spouse")
    family.add_relationship(dad_id, child1_id, "parent")
    family.add_relationship(mom_id, child1_id, "parent")

    return family
