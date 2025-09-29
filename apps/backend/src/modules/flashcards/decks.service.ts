import { Injectable, NotFoundException } from '@nestjs/common';
import { DecksRepository } from './decks.repository';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';

@Injectable()
export class DecksService {
  constructor(private readonly decksRepository: DecksRepository) {}

  async create(userId: string, createDeckDto: CreateDeckDto) {
    return this.decksRepository.create({
      ...createDeckDto,
      userId,
    });
  }

  async findAll(userId: string, query?: any) {
    return this.decksRepository.findByUserId(userId);
  }

  async findPublicDecks(query?: any) {
    const { page = 1, limit = 20, search } = query || {};
    // For now, return empty results - this would need proper implementation
    return {
      decks: [],
      total: 0,
      page,
      limit,
      hasMore: false,
    };
  }

  async cloneDeck(userId: string, deckId: string) {
    // Find the original deck
    const originalDeck = await this.decksRepository.findOne(deckId);
    if (!originalDeck) {
      throw new NotFoundException('Deck not found');
    }

    // Create a cloned deck
    const clonedDeck = await this.decksRepository.create({
      userId,
      title: `${originalDeck.title} (Copy)`,
      description: originalDeck.description,
      tags: originalDeck.tags,
      isPublic: false,
      clonedFromId: deckId,
    });

    return clonedDeck;
  }

  async findOne(userId: string, id: string) {
    const deck = await this.decksRepository.findOne(id);

    if (!deck || deck.userId !== userId) {
      throw new NotFoundException('Deck not found');
    }

    return deck;
  }

  async update(userId: string, id: string, updateDeckDto: UpdateDeckDto) {
    const deck = await this.findOne(userId, id);
    return this.decksRepository.update(id, updateDeckDto);
  }

  async remove(userId: string, id: string) {
    const deck = await this.findOne(userId, id);
    return this.decksRepository.delete(id);
  }

  async getStats(userId: string, deckId: string) {
    const deck = await this.findOne(userId, deckId);
    return this.decksRepository.getDeckStats(deckId);
  }
}
