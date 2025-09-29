import { Injectable } from '@nestjs/common';

export interface MockDatabase {
  users: any[];
  subjects: any[];
  studyTasks: any[];
  studySessions: any[];
  aiChats: any[];
  flashcardDecks: any[];
  flashcards: any[];
  assignments: any[];
  notifications: any[];
}

@Injectable()
export class MockDrizzleService {
  private mockData: MockDatabase;

  constructor() {
    this.initializeMockDatabase();
  }

  private initializeMockDatabase() {
    this.mockData = {
      users: [],
      subjects: [],
      studyTasks: [],
      studySessions: [],
      aiChats: [],
      flashcardDecks: [],
      flashcards: [],
      assignments: [],
      notifications: [],
    };
  }

  get db() {
    return {
      insert: (table: any) => ({
        values: (data: any) => ({
          returning: () => {
            const item = {
              id: this.generateId(),
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            this.getTableData(table).push(item);
            return Promise.resolve([item]);
          },
        }),
      }),
      select: () => ({
        from: (table: any) => ({
          where: (condition?: any) => ({
            orderBy: (order?: any) => ({
              limit: (limitNum?: number) => {
                const data = this.getTableData(table);
                return Promise.resolve(
                  limitNum ? data.slice(0, limitNum) : data,
                );
              },
            }),
            limit: (limitNum?: number) => {
              const data = this.getTableData(table);
              return Promise.resolve(limitNum ? data.slice(0, limitNum) : data);
            },
          }),
          limit: (limitNum?: number) => {
            const data = this.getTableData(table);
            return Promise.resolve(limitNum ? data.slice(0, limitNum) : data);
          },
          orderBy: (order?: any) => ({
            limit: (limitNum?: number) => {
              const data = this.getTableData(table);
              return Promise.resolve(limitNum ? data.slice(0, limitNum) : data);
            },
          }),
        }),
      }),
      update: (table: any) => ({
        set: (data: any) => ({
          where: (condition: any) => {
            const tableData = this.getTableData(table);
            const updated = tableData.map((item) => ({
              ...item,
              ...data,
              updatedAt: new Date(),
            }));
            this.setTableData(table, updated);
            return Promise.resolve(updated);
          },
        }),
      }),
      delete: (table: any) => ({
        where: (condition?: any) => {
          this.setTableData(table, []);
          return Promise.resolve(undefined);
        },
      }),
    };
  }

  private getTableData(table: any): any[] {
    const tableName = this.getTableName(table);
    return this.mockData[tableName] || [];
  }

  private setTableData(table: any, data: any[]): void {
    const tableName = this.getTableName(table);
    this.mockData[tableName] = data;
  }

  private getTableName(table: any): keyof MockDatabase {
    // Simple table name mapping - in a real implementation this would be more sophisticated
    if (table === 'users' || table?.name === 'users') return 'users';
    if (table === 'subjects' || table?.name === 'subjects') return 'subjects';
    if (table === 'study_tasks' || table?.name === 'study_tasks')
      return 'studyTasks';
    if (table === 'study_sessions' || table?.name === 'study_sessions')
      return 'studySessions';
    if (table === 'ai_chats' || table?.name === 'ai_chats') return 'aiChats';
    if (table === 'flashcard_decks' || table?.name === 'flashcard_decks')
      return 'flashcardDecks';
    if (table === 'flashcards' || table?.name === 'flashcards')
      return 'flashcards';
    if (table === 'assignments' || table?.name === 'assignments')
      return 'assignments';
    if (table === 'notifications' || table?.name === 'notifications')
      return 'notifications';

    // Default fallback
    return 'users';
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  async clearAllTables(): Promise<void> {
    this.mockData = {
      users: [],
      subjects: [],
      studyTasks: [],
      studySessions: [],
      aiChats: [],
      flashcardDecks: [],
      flashcards: [],
      assignments: [],
      notifications: [],
    };
  }

  async closeConnection(): Promise<void> {
    // Nothing to do for mock database
  }

  async getTableCount(tableName: string): Promise<number> {
    const data = this.mockData[tableName as keyof MockDatabase] || [];
    return data.length;
  }

  async checkConnection(): Promise<boolean> {
    return true;
  }

  // Direct access to mock data for testing
  getMockData(): MockDatabase {
    return this.mockData;
  }

  insertDirectly(tableName: keyof MockDatabase, data: any): any {
    const item = {
      id: this.generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockData[tableName].push(item);
    return item;
  }

  findById(tableName: keyof MockDatabase, id: string): any {
    return this.mockData[tableName].find((item: any) => item.id === id);
  }

  findByField(tableName: keyof MockDatabase, field: string, value: any): any[] {
    return this.mockData[tableName].filter(
      (item: any) => item[field] === value,
    );
  }

  updateById(tableName: keyof MockDatabase, id: string, updates: any): any {
    const index = this.mockData[tableName].findIndex(
      (item: any) => item.id === id,
    );
    if (index !== -1) {
      this.mockData[tableName][index] = {
        ...this.mockData[tableName][index],
        ...updates,
        updatedAt: new Date(),
      };
      return this.mockData[tableName][index];
    }
    return null;
  }

  deleteById(tableName: keyof MockDatabase, id: string): boolean {
    const index = this.mockData[tableName].findIndex(
      (item: any) => item.id === id,
    );
    if (index !== -1) {
      this.mockData[tableName].splice(index, 1);
      return true;
    }
    return false;
  }
}
