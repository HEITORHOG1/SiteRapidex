import { HttpInterceptorFn } from "@angular/common/http";

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem("auth.token");
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
