import type { Request, Response } from "express";
import Joi from "joi";
import validate from "../src/middleware/validate";

// The middleware only reads and writes req[source]; res isn't used
const res = {} as Response;

describe("validate(schema, 'query')", () => {
  const schema = Joi.object({ search: Joi.string().trim() });

  it("replaces req.query with the cleaned value", () => {
    const req = { query: { search: "  milo  " } } as unknown as Request;
    const next = jest.fn();

    validate(schema, "query")(req, res, next);

    expect(req.query).toEqual({ search: "milo" });
    expect(next).toHaveBeenCalledWith();
  });

  it("still works when req.query is a read-only getter, as in Express 5", () => {
    const req: Request = Object.create({
      get query() {
        return { search: "  milo  " };
      },
    });

    validate(schema, "query")(req, res, jest.fn());

    expect(req.query).toEqual({ search: "milo" });
  });

  it("validates an empty object when the request has none", () => {
    const req = {} as Request;
    const next = jest.fn();

    validate(Joi.object({ search: Joi.string().default("") }), "query")(req, res, next);

    expect(req.query).toEqual({ search: "" });
    expect(next).toHaveBeenCalledWith();
  });
});

describe("validate(schema, 'params')", () => {
  const schema = Joi.object({ id: Joi.number().integer().positive().required() });

  it("converts and replaces req.params with the validated value", () => {
    const req = { params: { id: "42" } } as unknown as Request;
    const next = jest.fn();

    validate(schema, "params")(req, res, next);

    expect(req.params).toEqual({ id: 42 });
    expect(next).toHaveBeenCalledWith();
  });
});
