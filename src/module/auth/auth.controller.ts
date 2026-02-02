import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/common/decorators/public.decorators';
import type { Request, Response } from 'express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import sendResponse from 'src/utils/sendResponse';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { userRole } from '@prisma';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from './dto/update-account.dto';
import { RequestResetCodeDto, VerifyResetCodeDto } from './dto/forgetPasswordDto';


@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    // private s3Service: S3Service, // ✅ Inject S3
  ) { }

  // refresh token
  @Post('refresh-token')
  @ApiOperation({
    summary: 'Refresh JWT tokens',
    description: 'Refreshes the access token using the provided refresh token.',
  })
  @ApiBody({
    description: 'Refresh token for refreshing access token',
    type: RefreshTokenDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully.',
  })
  async refreshToken(
    @Body('refreshToken') token: string,
    @Res() res: Response,
  ) {
    const result = await this.authService.refreshTokens(token);
    res.cookie('accessToken', result.access_token, {
      httpOnly: false, // Prevents client-side access to the cookie
      secure: false, // Only true for HTTPS
      maxAge: 86400000, // 1 day expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: false,
      secure: false, // Only true for HTTPS
      maxAge: 604800000, // 7 days expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Token refreshed',
      data: result,
    });
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(dto);

    res.cookie('accessToken', result.access_token, {
      httpOnly: false, // Prevents client-side access to the cookie
      secure: false, // Only true for HTTPS
      maxAge: 86400000, // 1 day expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: false,
      secure: false, // Only true for HTTPS
      maxAge: 604800000, // 7 days expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });
    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Registration successful',
      data: result,
    });
  }

  // login
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);
    res.cookie('accessToken', result.access_token, {
      httpOnly: false, // Prevents client-side access to the cookie
      secure: false, // Only true for HTTPS
      maxAge: 86400000, // 1 day expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: false,
      secure: false, // Only true for HTTPS
      maxAge: 604800000, // 7 days expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Login successful',
      data: result,
    });
  }

  // change password
  @Patch('change-password')
  @Roles(userRole.ADMIN, userRole.ATHLATE)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.changePassword(req.user!.id, dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Password changed',
      data: result,
    });
  }

  // @Put('activate-account')
  // @Roles(userRole.ADMIN)
  // async active_account(
  //   @Body() dto: AccountActiveDto,
  //   @Res() res: Response,
  //   @Req() req: Request,
  // ) {
  //   const result = await this.authService.active_account(dto);

  //   return sendResponse(res, {
  //     statusCode: HttpStatus.OK,
  //     success: true,
  //     message: 'Account activated successfully',
  //     data: result,
  //   });
  // }

  @UseInterceptors(FileInterceptor('image'))
  @Patch('update-profile')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update user profile with optional image upload',
    type: UpdateUserDto,
  })
  @ApiOperation({ summary: 'Update user profile (with optional image)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @Req() req: any,
    @Body() updateDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;
    let imageUrl: string | null = null;

    if (file) {
      try {
        // imageUrl = await this.s3Service.uploadFile(file, 'profile-images');
      } catch (error) {
        console.error(error, 'File Upload Error');
        // S3Service already wraps errors, but you can log or customize here
        return sendResponse(res, {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          success: false,
          message: 'Image upload failed. Please try again.',
          data: null,
        });
      }
    }

    const updatedUser = await this.authService.updateProfile(
      userId,
      updateDto,
      imageUrl,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  }

  

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: RequestResetCodeDto, @Res() res: Response) {
    const result = await this.authService.requestResetCode(
      dto
    );

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Reset Code sent successfully',
      data: result,
    });
  }

  @Public()
  @Post('forget-reset-password')
  async resetPassword(@Body() dto: VerifyResetCodeDto, @Res() res: Response) {
    const result = await this.authService.verifyResetCode(
      dto
    );

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Reset Password successful',
      data: result,
    });
  }

  @Get('me')
  @ApiOperation({
    summary: 'Check if a user is active',
    description: 'Returns  the user account ',
  })
  async currentUser(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.id;
    const result = await this.authService.currentUser(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User profile retrieved',
      data: result,
    });
  }

  @Get('allUsers')
  @Roles(userRole.ADMIN)
  async getUsers(@Res() res: Response) {
    const result = await this.authService.getUsers();
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User profile retrieved',
      data: result,
    });
  }


}
