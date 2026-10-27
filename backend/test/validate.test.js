const Joi = require("joi");
const validate = require("../src/middleware/validate");

describe("validate(schema, 'query')", () => {
  const schema = Joi.object({ search: Joi.string().trim() });

  it("replaces req.query with the cleaned value", () => {
    const req = { query: { search: "  milo  " } };
    const next = jest.fn();

    validate(schema, "query")(req, {}, next);

    expect(req.query).toEqual({ search: "milo" });
    expect(next).toHaveBeenCalledWith();
  });

  it("still works when req.query is a read-only getter, as in Express 5", () => {
    const req = Object.create({
      get query() {
        return { search: "  milo  " };
      },
    });

    validate(schema, "query")(req, {}, jest.fn());

    expect(req.query).toEqual({ search: "milo" });
  });

  it("validates an empty object when the request has none", () => {
    const req = {};
    const next = jest.fn();

    validate(Joi.object({ search: Joi.string().default("") }), "query")(req, {}, next);

    expect(req.query).toEqual({ search: "" });
    expect(next).toHaveBeenCalledWith();
  });
});
