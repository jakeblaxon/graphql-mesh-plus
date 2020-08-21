import { makeExecutableSchema } from "@graphql-tools/schema";
import transform from "../src/index";
import { execute } from "graphql";
import gql from "graphql-tag";

describe("index", () => {
  const schema = makeExecutableSchema({
    typeDefs: `#graphql
      type Query {
        author(idsIn: [Int]): [Author]
        book: Book
        addresses(idsIn: [String]): [Address]
      }

      type Author {
        id: Int
        name: String
        age: Int
        addressId: String
      }

      type Book {
        title: String
        authorId: Int
      }

      type Address {
        id: String
        line1: String
      }
    `,
    resolvers: {
      Query: {
        author() {
          console.log("author called");
          return [{ id: 1, name: "Alice", age: 30, addressId: "a" }];
        },
        book() {
          console.log("book called");
          return { title: "Book", authorId: 1 };
        },
        addresses() {
          console.log("address called");
          return [{id: "a", line1: "test"}]
        }
      },
    },
  });

  it("shouldn't double nested calls", async () => {
    const transformedSchema = transform({
      action: null as any,
      sourceName: null as any,
      loader: null as any,
      schema,
      config: {
        typeDefs: `#graphql
          extend type Book {
            author: Author
          }
          extend type Author {
            address: Address
          }
        `,
        resolvers: {
          Book: {
            author: {
              queryName: "author",
              argsMapping: { idsIn: "roots[*].authorId" },
              keyMapping: { id: "root.authorId" },
            },
          },
          Author: {
            address: {
              queryName: "addresses",
              argsMapping: { idsIn: "roots[*].addressId" },
              keyMapping: { id: "root.addressId" },
            },
          },
        },
      },
    });

    const result = await execute({
      schema: await transformedSchema,
      document: gql`
        {
          book {
            title
            author {
              id
              name
              age
              address {
                id
                line1
              }
            }
          }
        }
      `,
    });
    // console.log(JSON.stringify(result, null, 2))
  });
});
