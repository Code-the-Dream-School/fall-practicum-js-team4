import type { Request, Response } from "express";
import Joi from "joi";
import errorHandler from "../src/middleware/errorHandler";
import validate from "../src/middleware/validate";
import AppError from "../src/utils/AppError";

// Minimal stand-in for Express's res: records the status and JSON body
const fakeRes = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

describe("errorHandler", () => {
  const handle = (err: Error) => {
    const res = fakeRes();
    errorHandler(err, {} as Request, res as unknown as Response, () => {});
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
  };

  it.each([
    [400, "BAD_REQUEST", "Bad Request"],
    [405, "METHOD_NOT_ALLOWED", "Method Not Allowed"],
    [418, "I_M_A_TEAPOT", "I'm a teapot"],
  ])("keeps the status of a %i client error and names it", (status, code, message) => {
    expect(handle(Object.assign(new Error("raw"), { status }))).toEqual({
      status,
      body: { success: false, code, message },
    });
  });

  it("falls back to BAD_REQUEST for a 4xx status with no standard name", () => {
    expect(handle(Object.assign(new Error("raw"), { status: 499 }))).toEqual({
      status: 499,
      body: { success: false, code: "BAD_REQUEST", message: "Bad request" },
    });
  });

  it("sends details only when the AppError has them", () => {
    const details = [{ field: "email", message: "required" }];
    expect(handle(new AppError(400, "VALIDATION_ERROR", "Invalid", details)).body).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid",
      details,
    });
    expect(handle(new AppError(404, "NOT_FOUND", "Nope")).body).not.toHaveProperty("details");
  });

  it("hides unexpected errors behind a generic 500", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(handle(new Error("secret database detail"))).toEqual({
      status: 500,
      body: { success: false, code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("validate", () => {
  const schema = Joi.object({ name: Joi.string().default("anon") });

  it("validates an empty object when the request has no body", () => {
    const req = {} as Request;
    const next = jest.fn();

    validate(schema)(req, {} as Response, next);

    expect(req.body).toEqual({ name: "anon" });
    expect(next).toHaveBeenCalledWith();
  });

  it("passes a VALIDATION_ERROR with every problem to next()", () => {
    const req = { body: { name: 1, extra: true } } as Request;
    const next = jest.fn();

    validate(schema)(req, {} as Response, next);

    const err: AppError = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.details?.map((d) => d.field)).toEqual(["name", "extra"]);
  });
});
