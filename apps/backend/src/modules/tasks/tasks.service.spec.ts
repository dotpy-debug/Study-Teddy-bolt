import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { DatabaseService } from '../../db/database.service';
import { NotFoundException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let databaseService: DatabaseService;

  const mockTask = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    subject: 'Mathematics',
    dueDate: new Date('2024-12-31'),
    priority: 'high' as const,
    status: 'pending' as const,
    userId: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDatabaseService = {
    db: {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createTaskDto = {
        title: 'New Task',
        description: 'New Description',
        subject: 'Science',
        dueDate: new Date('2024-12-31'),
        priority: 'medium' as const,
      };

      const mockChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockTask]),
      };

      mockDatabaseService.db.insert.mockReturnValue(mockChain);

      const result = await service.create('user1', createTaskDto);

      expect(result).toEqual(mockTask);
      expect(mockDatabaseService.db.insert).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all tasks for a user', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([mockTask]),
      };

      mockDatabaseService.db.select.mockReturnValue(mockChain);

      const result = await service.findAll('user1');

      expect(result).toEqual([mockTask]);
      expect(mockDatabaseService.db.select).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockTask]),
      };

      mockDatabaseService.db.select.mockReturnValue(mockChain);

      const result = await service.findOne('user1', '1');

      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task not found', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      mockDatabaseService.db.select.mockReturnValue(mockChain);

      await expect(service.findOne('user1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateTaskDto = {
        title: 'Updated Task',
        status: 'completed' as const,
      };

      const updatedTask = { ...mockTask, ...updateTaskDto };

      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockTask]),
      };

      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedTask]),
      };

      mockDatabaseService.db.select.mockReturnValue(selectChain);
      mockDatabaseService.db.update.mockReturnValue(updateChain);

      const result = await service.update('user1', '1', updateTaskDto);

      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException when updating non-existent task', async () => {
      const updateTaskDto = {
        title: 'Updated Task',
      };

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      mockDatabaseService.db.select.mockReturnValue(mockChain);

      await expect(
        service.update('user1', 'nonexistent', updateTaskDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a task', async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockTask]),
      };

      const deleteChain = {
        where: jest.fn().mockResolvedValue(undefined),
      };

      mockDatabaseService.db.select.mockReturnValue(selectChain);
      mockDatabaseService.db.delete.mockReturnValue(deleteChain);

      await expect(service.remove('user1', '1')).resolves.not.toThrow();
    });

    it('should throw NotFoundException when deleting non-existent task', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      mockDatabaseService.db.select.mockReturnValue(mockChain);

      await expect(service.remove('user1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
