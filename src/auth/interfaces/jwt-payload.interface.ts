export interface JwtPayload {
  sub: string;
  phone: string;
  mahber_id?: string;
  role?: string;
  iat?: number;
  exp?: number;
}
