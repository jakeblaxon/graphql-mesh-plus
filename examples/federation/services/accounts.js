const { gql } = require("apollo-server");

exports.typeDefs = gql`
  type Query {
    me: User
    user(id: ID!): User
    users: [User]
  }

  type User @key(fields: "id") {
    id: ID!
    name: String
    username: String
  }
`;

exports.resolvers = {
  Query: {
    me(root, args, context) {
      return users[0];
    },
    users(root, args, context) {
      return users;
    },
    user(root, args, context) {
      return users.find((user) => user.id === args.id);
    },
  },
};

const users = [
  {
    id: 1,
    name: "Alice",
    users: [],
  },
  {
    id: 2,
    name: "Bob",
    users: [],
  },
];
