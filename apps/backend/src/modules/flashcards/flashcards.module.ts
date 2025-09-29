import { Module } from '@nestjs/common';
import { FlashcardsController } from './flashcards.controller';
import { FlashcardsService } from './flashcards.service';
import { FlashcardsRepository } from './flashcards.repository';
import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';
import { DecksRepository } from './decks.repository';

@Module({
  controllers: [FlashcardsController, DecksController],
  providers: [
    FlashcardsService,
    FlashcardsRepository,
    DecksService,
    DecksRepository,
  ],
  exports: [FlashcardsService, DecksService],
})
export class FlashcardsModule {}
