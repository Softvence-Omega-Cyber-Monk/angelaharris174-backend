// src/common/guards/subscription.guard.ts
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUBSCRIPTION_KEY } from '../decorators/subscription.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredStatus = this.reflector.getAllAndOverride<string[]>(
            SUBSCRIPTION_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If no specific subscription is required, allow access
        if (!requiredStatus || requiredStatus.length === 0) return true;

        const { user } = context.switchToHttp().getRequest();

        // Ensure user exists (should be handled by JwtGuard first)
        if (!user) throw new ForbiddenException('No user found');

        // Special allowance for ADMIN (admins usually bypass subscription restrictions)
        if (user.role === 'ADMIN') return true;

        // Check if user's status is in the allowed list
        if (!requiredStatus.includes(user.subscribeStatus)) {
            throw new ForbiddenException('Your current subscription level does not permit access to this resource');
        }

        return true;
    }
}
