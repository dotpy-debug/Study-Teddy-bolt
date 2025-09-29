import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { TaskParserService } from './services/task-parser.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryDto,
  BatchUpdateTasksDto,
  BatchDeleteTasksDto,
  UpdateTaskProgressDto,
} from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private tasksService: TasksService,
    private taskParserService: TaskParserService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get user tasks',
    description:
      'Retrieve all tasks for the authenticated user with optional filtering',
  })
  @ApiQuery({ type: TaskQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          subject: { type: 'string' },
          description: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          completed: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TaskQueryDto,
  ) {
    // Map query to options format
    const options = {
      searchTerm: query.search,
      status: query.status,
      priority: query.priority,
      subjectIds: query.subjectIds,
      dueDateFrom: query.dueDateFrom,
      dueDateTo: query.dueDateTo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: query.limit,
      offset: query.offset,
    };

    return this.tasksService.getTasksWithFilters(user.userId, options);
  }

  @Get('today')
  @ApiOperation({
    summary: "Get today's tasks",
    description: 'Retrieve tasks due today for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: "Today's tasks retrieved successfully",
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getTodaysTasks(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.getTodaysTasks(user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get task by ID',
    description: 'Retrieve a specific task by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this task' })
  async getTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.getTaskById(id, user.userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create new task',
    description: 'Create a new task for the authenticated user',
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid task data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.createTask(user.userId, createTaskDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update task',
    description: 'Update an existing task',
  })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid task data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this task' })
  async updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.updateTask(id, user.userId, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete task',
    description: 'Delete a task by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Task deleted successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this task' })
  async deleteTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.deleteTask(id, user.userId);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Toggle task completion',
    description: 'Toggle the completion status of a task',
  })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Task completion status updated successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this task' })
  async toggleTaskCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.toggleTaskCompletion(id, user.userId);
  }

  @Post('batch/update')
  @ApiOperation({
    summary: 'Batch update tasks',
    description: 'Update multiple tasks at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid batch update data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async batchUpdateTasks(
    @Body() batchUpdateDto: BatchUpdateTasksDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.batchUpdateTasks(
      user.userId,
      batchUpdateDto.taskIds,
      batchUpdateDto.updateData,
    );
  }

  @Post('batch/delete')
  @ApiOperation({
    summary: 'Batch delete tasks',
    description: 'Delete multiple tasks at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks deleted successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid batch delete data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async batchDeleteTasks(
    @Body() batchDeleteDto: BatchDeleteTasksDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.batchDeleteTasks(
      user.userId,
      batchDeleteDto.taskIds,
    );
  }

  @Get('status/:status')
  @ApiOperation({
    summary: 'Get tasks by status',
    description: 'Retrieve tasks filtered by specific status',
  })
  @ApiParam({
    name: 'status',
    description: 'Task status',
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getTasksByStatus(
    @Param('status') status: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.getTasksByStatus(user.userId, status);
  }

  @Patch(':id/progress')
  @ApiOperation({
    summary: 'Update task progress',
    description: 'Update the progress percentage of a task',
  })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Task progress updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid progress data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this task' })
  async updateTaskProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() progressDto: UpdateTaskProgressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.updateTaskProgress(
      id,
      user.userId,
      progressDto.progressPercentage,
    );
  }

  @Post('parse')
  @ApiOperation({
    summary: 'Parse natural language task input',
    description: 'Parse natural language input into structured task data',
  })
  @ApiResponse({
    status: 200,
    description: 'Task input parsed successfully',
    schema: {
      type: 'object',
      properties: {
        parsed: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            subjectId: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
            estimatedMinutes: { type: 'number' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            },
          },
        },
        createTaskDto: { $ref: '#/components/schemas/CreateTaskDto' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async parseTaskInput(
    @Body()
    body: {
      input: string;
      availableSubjects?: Array<{ id: string; name: string }>;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = this.taskParserService.parseTaskInput(
      body.input,
      body.availableSubjects,
    );
    const createTaskDto = this.taskParserService.convertToCreateTaskDto(parsed);

    return {
      parsed,
      createTaskDto,
    };
  }

  @Post('parse/create')
  @ApiOperation({
    summary: 'Parse and create task from natural language',
    description: 'Parse natural language input and immediately create a task',
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully from parsed input',
  })
  @ApiBadRequestResponse({ description: 'Invalid input or task data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async parseAndCreateTask(
    @Body()
    body: {
      input: string;
      availableSubjects?: Array<{ id: string; name: string }>;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = this.taskParserService.parseTaskInput(
      body.input,
      body.availableSubjects,
    );
    const createTaskDto = this.taskParserService.convertToCreateTaskDto(parsed);

    // Set AI generated flag since this was parsed
    createTaskDto.aiGenerated = true;
    createTaskDto.aiMetadata = {
      model: 'natural-language-parser',
      prompt: body.input,
      confidence: 0.8,
    };

    const task = await this.tasksService.createTask(user.userId, createTaskDto);

    return {
      task,
      parsed,
      originalInput: body.input,
    };
  }

  @Get('parse/suggestions')
  @ApiOperation({
    summary: 'Get auto-completion suggestions',
    description:
      'Get suggestions for auto-completing natural language task input',
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getTaskInputSuggestions(
    @Query('input') input: string,
    @Query('availableSubjects') availableSubjectsJson?: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    let availableSubjects: Array<{ id: string; name: string }> | undefined;

    if (availableSubjectsJson) {
      try {
        availableSubjects = JSON.parse(availableSubjectsJson);
      } catch (error) {
        // Ignore invalid JSON
      }
    }

    const suggestions = this.taskParserService.getSuggestions(
      input,
      availableSubjects,
    );

    return { suggestions };
  }
}
