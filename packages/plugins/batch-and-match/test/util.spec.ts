import {
  applyMapping,
  hash,
  mapEntitiesToRoots,
  extractCombinatorialSubsets,
} from "../src/util";

describe("applyMapping", () => {
  const roots = [
    {
      id: 1,
      name: "Alice",
      friends: ["Bob", "Chris"],
    },
    {
      id: 2,
      name: "Bob",
      friends: ["Chris", "Debbie"],
    },
  ];

  it("should return null given null or undefined args", async () => {
    expect(applyMapping(null, null)).toBeNull();
    expect(applyMapping(undefined, null)).toBeNull();
  });
  it("should return an empty object given an empty args object", async () => {
    expect(applyMapping({}, null)).toEqual({});
  });
  it("should correctly map top-level args fields", async () => {
    expect(
      applyMapping(
        { idsIn: "roots[*].id", namesIn: "roots[*].name" },
        { roots }
      )
    ).toEqual({
      idsIn: [1, 2],
      namesIn: ["Alice", "Bob"],
    });
  });
  it("should correctly map nested args fields", async () => {
    expect(
      applyMapping(
        {
          ids: { in: "roots[*].id" },
          names: { in: "roots[*].name" },
        },
        { roots }
      )
    ).toEqual({
      ids: { in: [1, 2] },
      names: { in: ["Alice", "Bob"] },
    });
  });
  it("should handle lists and maintain their orders", async () => {
    expect(
      applyMapping(
        {
          in: [{ ids: "roots[*].id" }, { names: "roots[*].name" }],
        },
        { roots }
      )
    ).toEqual({
      in: [{ ids: [1, 2] }, { names: ["Alice", "Bob"] }],
    });
  });
  it("should maintain constants, including strings that are not json paths", async () => {
    expect(
      applyMapping(
        {
          isFemale: true,
          ageOver: 21,
          nameStartsWith: "A",
          profession: "Doctor",
        },
        { roots }
      )
    ).toEqual({
      isFemale: true,
      ageOver: 21,
      nameStartsWith: "A",
      profession: "Doctor",
    });
  });
  it("should correctly identify and parse json paths", async () => {
    expect(
      applyMapping(
        {
          idsIn: "roots[*].id",
          namesIn: "$.roots[*].name",
          friendsIn: "roots[*].friends[*]",
        },
        { roots }
      )
    ).toEqual({
      idsIn: [1, 2],
      namesIn: ["Alice", "Bob"],
      friendsIn: ["Bob", "Chris", "Chris", "Debbie"],
    });
    expect(
      applyMapping(
        {
          id: "root.id",
          name: "$.root.name",
          friends: "root.friends[*]",
        },
        { root: roots[0] }
      )
    ).toEqual({
      id: 1,
      name: "Alice",
      friends: ["Bob", "Chris"],
    });
  });
  it("should not return single objects in a list", async () => {
    expect(
      applyMapping(
        {
          firstName: "root.name",
        },
        { root: roots[0] }
      )
    ).toEqual({
      firstName: "Alice",
    });
  });
  it("should correctly handle and return singleton lists", async () => {
    expect(
      applyMapping(
        {
          namesIn: "roots[*].name",
        },
        {
          roots: [
            {
              name: "Alice",
            },
          ],
        }
      )
    ).toEqual({
      namesIn: ["Alice"],
    });
  });
  it("should apply transformaations followed by a pipe symbol", async () => {
    expect(
      applyMapping({ result: "root.test | $ + 5" }, { root: { test: 10 } })
    ).toEqual({
      result: 15,
    });
    expect(
      applyMapping(
        { result: "root.test[*] | $ + 5" },
        { root: { test: [1, 2, 3] } }
      )
    ).toEqual({
      result: [6, 7, 8],
    });
  });
});

describe("extractCombinatorialSubsets", () => {
  const obj = {
    person: {
      name: "Alice",
      address: {
        street: "123 main",
        zip: 12345,
      },
      friends: [
        { name: "Bob", age: 30, friends: ["Jack", "Jane"] },
        { name: "Chris", age: 35, friends: ["Jack"] },
      ],
      enemies: ["Debbie", "Erin"],
    },
    age: null,
  };

  it("should return an empty list given null or undefined args", async () => {
    expect(extractCombinatorialSubsets(null, obj)).toEqual([]);
    expect(extractCombinatorialSubsets(undefined, obj)).toEqual([]);
  });
  it("should map undefined to subset fields not found in object", async () => {
    expect(extractCombinatorialSubsets({ missingField: "..." }, obj)).toEqual([
      {
        missingField: undefined,
      },
    ]);
  });
  it("should map null to subset fields whose values are null in the object", async () => {
    expect(extractCombinatorialSubsets({ age: "..." }, obj)).toEqual([
      {
        age: null,
      },
    ]);
  });
  it("should correctly map subset fields found in the object", async () => {
    expect(
      extractCombinatorialSubsets({ person: { name: "..." } }, obj)
    ).toEqual([
      {
        person: { name: "Alice" },
      },
    ]);
  });
  it("should map the entire value or object specified by a subset field", async () => {
    expect(extractCombinatorialSubsets({ person: "..." }, obj)).toEqual([
      {
        person: obj.person,
      },
    ]);
  });
  it("should return a selection sets for each item in a list", async () => {
    expect(
      extractCombinatorialSubsets({ person: { friends: { name: "..." } } }, obj)
    ).toEqual([
      {
        person: {
          friends: { name: "Bob" },
        },
      },
      {
        person: {
          friends: { name: "Chris" },
        },
      },
    ]);
  });
  it("should return each possible subset for nested lists", async () => {
    const result = extractCombinatorialSubsets(
      { person: { friends: { name: "", friends: "" }, enemies: "" } },
      obj
    );
    expect(result.length).toEqual(6);
    expect(result).toEqual(
      // @ts-ignore
      expect.arrayContaining([
        {
          person: {
            friends: { name: "Bob", friends: "Jack" },
            enemies: "Debbie",
          },
        },
        {
          person: {
            friends: { name: "Bob", friends: "Jane" },
            enemies: "Debbie",
          },
        },
        {
          person: {
            friends: { name: "Chris", friends: "Jack" },
            enemies: "Debbie",
          },
        },
        {
          person: {
            friends: { name: "Bob", friends: "Jack" },
            enemies: "Erin",
          },
        },
        {
          person: {
            friends: { name: "Bob", friends: "Jane" },
            enemies: "Erin",
          },
        },
        {
          person: {
            friends: { name: "Chris", friends: "Jack" },
            enemies: "Erin",
          },
        },
      ])
    );
  });
});

describe("hash", () => {
  it("should hash an object to a string", async () => {
    expect(typeof hash({})).toEqual("string");
  });
  it("should handle the null case", async () => {
    expect(typeof hash(null)).toEqual("string");
  });
  it("should hash two equal objects to the same value", async () => {
    const obj1 = { name: "Alice", age: 25 };
    const obj2 = { age: 25, name: "Alice" };
    expect(hash(obj1)).toEqual(hash(obj2));
  });
  it("should hash two nonequal objects to different values", async () => {
    const obj1 = { name: "Alice", age: 25 };
    const obj2 = { name: "Bob", age: 25 };
    expect(hash(obj1)).not.toEqual(hash(obj2));
  });
  it("should hash equivalent lists in different orders equally", async () => {
    const obj1 = ["Alice", "Bob", null];
    const obj2 = [null, "Bob", "Alice"];
    expect(hash(obj1)).toEqual(hash(obj2));
  });
  it("should handle nested objects", async () => {
    const obj1 = {
      person: {
        name: "Alice",
        friends: [{ name: "Bob" }, { name: "Chris" }],
      },
      age: 25,
    };
    const obj2 = {
      person: {
        name: "Alice",
        friends: [{ name: "Chris" }, { name: "Bob" }],
      },
      age: 25,
    };
    const obj3 = {
      person: {
        name: "Alice",
        friends: [{ name: "Chris" }, { name: "Debbie" }],
      },
      age: 25,
    };
    expect(hash(obj1)).toEqual(hash(obj2));
    expect(hash(obj2)).not.toEqual(hash(obj3));
  });
});

describe("mapEntitiesToRoots", () => {
  const schools = [{ id: "A" }, { id: "B" }, { id: "C" }];
  const professors = [
    { id: 3, schoolId: "A" },
    { id: 2, schoolId: "A" },
    { id: 1, schoolId: "B" },
  ];
  const classes = [
    { id: 10, professorId: 1 },
    { id: 20, professorId: 2 },
    { id: 30, professorId: 3 },
    { id: 40, professorId: null },
  ];
  const students = [
    { id: "000", classes: [] },
    { id: "111", classes: [10] },
    { id: "222", classes: [20] },
    { id: "333", classes: [30] },
    { id: "444", classes: [10, 20] },
    { id: "555", classes: [10, 30] },
    { id: "666", classes: [20, 30] },
    { id: "777", classes: [10, 20, 30] },
  ];
  const dorms = [
    { id: "a", students: ["000", "111", "777"] },
    { id: "b", students: ["222", "333"] },
    { id: "c", students: [] },
  ];

  it("should handle one-to-one relationships", async () => {
    const result = mapEntitiesToRoots(
      classes,
      professors,
      {
        professorId: "root.id",
      },
      false
    );
    expect(result).toEqual([classes[2], classes[1], classes[0]]);
  });
  it("should handle one-to-many relationships", async () => {
    const result = mapEntitiesToRoots(
      professors,
      schools,
      {
        schoolId: "root.id",
      },
      true
    );
    expect(result).toEqual([
      [professors[0], professors[1]],
      [professors[2]],
      [],
    ]);
  });
  it("should handle many-to-one relationships", async () => {
    const result = mapEntitiesToRoots(
      dorms,
      students,
      {
        students: "root.id",
      },
      false
    );
    expect(result).toEqual([
      dorms[0],
      dorms[0],
      dorms[1],
      dorms[1],
      null,
      null,
      null,
      dorms[0],
    ]);
  });
  it("should handle many-to-many relationships", async () => {
    const result = mapEntitiesToRoots(
      students,
      classes,
      {
        classes: "root.id",
      },
      true
    );
    expect(result).toEqual([
      [students[1], students[4], students[5], students[7]],
      [students[2], students[4], students[6], students[7]],
      [students[3], students[5], students[6], students[7]],
      [],
    ]);
  });
});
