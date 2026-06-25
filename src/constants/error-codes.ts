export const Errors = {
  AlreadyExists: {
    code: 409,
    message: "Document already exist",
  },
  NotFound: {
    code: 404,
    message: "Document not found",
  },
  Unauthorized: {
    code: 401,
    message: "Wrong credentials",
  },
  BadRequest: {
    code: 400,
    message: "Bad request",
  },
  NoToken: {
    code: 401,
    message: "No token provided",
  },
  InvalidToken:{
    code:500,
    message:"Invalid token"
  },
  Forbidden: {
    code: 405,
    message: "Insufficient permission",
  },
  EnumValue:{
    code:405,
    message:"Invalid enum value"
  }
};
