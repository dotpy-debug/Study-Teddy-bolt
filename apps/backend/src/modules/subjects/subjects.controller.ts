import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectsDto } from './dto/query-subjects.dto';
import { SubjectAnalyticsQueryDto } from './dto/subject-analytics.dto';

@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subject created successfully',
  })
  async create(
    @CurrentUser() userId: string,
    @Body() createSubjectDto: CreateSubjectDto,
  ) {
    return this.subjectsService.create(userId, createSubjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subjects for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subjects retrieved successfully',
  })
  async findAll(
    @CurrentUser() userId: string,
    @Query() query: QuerySubjectsDto,
  ) {
    return this.subjectsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific subject' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subject retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subject not found',
  })
  async findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.subjectsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subject' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subject updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subject not found',
  })
  async update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(userId, id, updateSubjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subject' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subject deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subject not found',
  })
  async remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.subjectsService.remove(userId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get subject statistics (legacy)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStats(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.subjectsService.getSubjectStats(userId, id);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get detailed subject analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics retrieved successfully',
    type: 'SubjectAnalyticsResponse',
  })
  async getAnalytics(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Query() query: SubjectAnalyticsQueryDto,
  ) {
    return this.subjectsService.getSubjectAnalytics(userId, id, query);
  }

  @Get('distribution')
  @ApiOperation({ summary: 'Get subject distribution data for charts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Distribution data retrieved successfully',
  })
  async getDistribution(@CurrentUser() userId: string) {
    return this.subjectsService.getSubjectDistribution(userId);
  }
}
