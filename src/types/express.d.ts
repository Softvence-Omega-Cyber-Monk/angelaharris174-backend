import { JwtPayload } from '../module/auth/strategy/jwt.strategy';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends JwtPayload {}
  }
}
