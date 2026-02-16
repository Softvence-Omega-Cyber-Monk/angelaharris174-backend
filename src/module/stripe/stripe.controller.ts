// src/stripe/stripe.controller.ts
import { Controller, Post, Body, Req, Res, UseGuards, HttpException, HttpStatus, Get, Patch, Param } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StripeService } from './stripe.service';
import { AuthGuard } from '@nestjs/passport'; // assuming you have auth
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { CreateCheckoutSessionDto, CreateProductDto, UpdatePlanDto } from './dto/strpe.dto';
import { Public } from 'src/common/decorators/public.decorators';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) { }

  @Public()
  @Post('product-and-price')
  @ApiResponse({ status: 201, description: 'Plan created and synced with Stripe' })
  @ApiBody({ type: CreateProductDto })
  async createProductAndPrice(@Body() dto: CreateProductDto) {
    try {
      const {
        name,
        description,
        amount,
        currency = 'usd',
        interval = 'month',
        features = [],
        isPopular = false,
      } = dto;

      if (!name || amount <= 0) {
        throw new HttpException(
          'Name and valid amount (in cents) are required',
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.stripeService.createSubscriptionProductAndPrice(
        name,
        amount,
        currency,
        interval,
        description,
        features,
        isPopular
      );

      return {
        success: true,
        message: 'Plan created successfully',
        plan: result.plan,
        stripe: {
          productId: result.productId,
          priceId: result.priceId,
        },
      };
    } catch (error) {
      console.error('Error creating plan:', error);
      throw new HttpException(
        error.message || 'Failed to create plan and sync with Stripe',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('create-checkout-session')
  async createCheckoutSession(
    @Req() req: Request,
    @Body() dto: CreateCheckoutSessionDto
  ) {
    const userId = req.user!.id; // From JWTAuthGuard
    const { priceId } = dto;

    const successUrl = `${process.env.FRONTEND_URL}/subscription-success`;
    const cancelUrl = `${process.env.FRONTEND_URL}/subscription-cancel`;

    console.log('Creating checkout session:', { userId, priceId });

    const session = await this.stripeService.createCheckoutSession(
      userId,
      priceId,
      successUrl,
      cancelUrl
    );

    return {
      success: true,
      url: session.url, // Redirect frontend to this URL
    };
  }

  // GET /stripe/plans → returns all plans
  @Public()
  @Get('plans')
  @ApiResponse({ status: 200, description: 'List of all subscription plans' })
  async findAllPlans() {
    try {
      const plans = await this.stripeService.findAllPlans();
      return {
        success: true,
        data: plans,
      };
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw new HttpException(
        'Failed to fetch plans',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // 🔒 Admin-only: get ALL subscriptions
  @Public()
  @Get('get-all-subscription')
  async getAllSubscriptions(@Req() req: Request) {
    const subscriptions = await this.stripeService.findAllSubscriptions();
    return {
      statusCode: HttpStatus.OK,
      data: subscriptions,
      count: subscriptions.length,
    };
  }

  // PATCH /stripe/plans/:id
  @Public()
  @Patch('plans/:id')
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  @ApiBody({ type: UpdatePlanDto })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto
  ) {
    try {
      const updatedPlan = await this.stripeService.updatePlan(id, dto);
      return {
        success: true,
        message: 'Plan updated successfully',
        plan: updatedPlan,
      };
    } catch (error) {
      console.error('Error updating plan:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || 'Failed to update plan',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post('webhook')
  async webhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    const rawBody = req.body;
    try {
      await this.stripeService.handleWebhookEvent(sig, rawBody);
      res.status(200).json({ received: true });
    } catch (err) {
      console.error('Webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  @Get('subscriptionDetails/:subscriptionId')
  async getUserSubscription(
    @Req() req: Request,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    if (!subscriptionId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'subscriptionId is required',
      };
    }

    const subscription = await this.stripeService.findSubscriptionById(
      subscriptionId,
    );

    if (!subscription) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Subscription not found or access denied',
      };
    }

    return {
      statusCode: HttpStatus.OK,
      data: subscription,
    };
  }

  @Get('transactions')
  async getUserTransactions(@Req() req: Request) {
    const userId = req.user!.id;
    const transactions = await this.stripeService.findTransactionsByUserId(userId);
    return {
      statusCode: HttpStatus.OK,
      data: transactions,
    };
  }

  @Public() // In production, add @UseGuards(AdminGuard)
  @Get('dashboard-stats')
  async AdminSubscriptionStats() {
    const stats = await this.stripeService.AdminSubscriptionStats();
    return {
      statusCode: HttpStatus.OK,
      data: stats,
    };
  }
}