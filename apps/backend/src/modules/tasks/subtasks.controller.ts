import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SubtasksService } from './subtasks.service';
import {
  CreateSubtaskDto,
  UpdateSubtaskDto,
  BulkCreateSubtasksDto,
  ReorderSubtaskDto,
} from './dto/subtask.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Subtasks')
@ApiBearerAuth()
@Controller('subtasks')
@UseGuards(JwtAuthGuard)
export class SubtasksController {
  constructor(private subtasksService: SubtasksService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new subtask',
    description: 'Create a new subtask for an existing task',
  })
  @ApiResponse({
    status: 201,
    description: 'Subtask created successfully',
  })
  async createSubtask(
    @Body() createSubtaskDto: CreateSubtaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subtasksService.createSubtask(user.userId, createSubtaskDto);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Create multiple subtasks at once',
    description: 'Create multiple subtasks for a task from an array of titles',
  })
  @ApiResponse({
    status: 201,
    description: 'Subtasks created successfully',
  })
  async bulkCreateSubtasks(
    @Body() bulkCreateDto: BulkCreateSubtasksDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subtasksService.bulkCreateSubtasks(user.userId, bulkCreateDto);
  }

  @Get('task/:taskId')
  @ApiOperation({
    summary: 'Get all subtasks for a task',
    description: 'Retrieve all subtasks associated with a specific task',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Parent task ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Subtasks retrieved successfully',
  })
  async getTaskSubtasks(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subtasksService.getTaskSubtasks(user.userId, taskId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a subtask',
    description: 'Update an existing subtask',
  })
  @ApiParam({
    name: 'id',
    description: 'Subtask ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Subtask updated successfully',
  })
  async updateSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubtaskDto: UpdateSubtaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subtasksService.updateSubtask(id, user.userId, updateSubtaskDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a subtask',
    description: 'Delete a subtask by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Subtask ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Subtask deleted successfully',
  })
  async deleteSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subtasksService.deleteSubtask(id, user.userId);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Toggle subtask completion',
    description: 'Toggle the completion status of a subtask',
  })
  @ApiParam({
    name: 'id',
    description: 'Subtask ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Subtask completion status updated successfully',
  })
  async toggleSubtaskCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subtasksService.toggleSubtaskCompletion(id, user.userId);
  }

  @Patch(':id/reorder')
  @ApiOperation({
    summary: 'Reorder subtask',
    description: 'Change the order position of a subtask',
  })
  @ApiParam({
    name: 'id',
    description: 'Subtask ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Subtask reordered successfully',
  })
  async reorderSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reorderDto: ReorderSubtaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.subtasksService.reorderSubtask(id, user.userId, reorderDto.position);
  }
}
