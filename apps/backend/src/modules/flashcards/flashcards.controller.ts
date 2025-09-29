import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { FlashcardsService } from './flashcards.service';

@ApiTags('flashcards')
@Controller('flashcards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post(':deckId')
  @ApiOperation({ summary: 'Create a new flashcard in a deck' })
  create(
    @CurrentUser() user: any,
    @Param('deckId') deckId: string,
    @Body() createFlashcardDto: any,
  ) {
    return this.flashcardsService.create(
      user.userId,
      deckId,
      createFlashcardDto,
    );
  }

  @Get('deck/:deckId')
  @ApiOperation({ summary: 'Get all flashcards in a deck' })
  findByDeck(@Param('deckId') deckId: string) {
    return this.flashcardsService.findByDeck(deckId);
  }

  @Get('deck/:deckId/due')
  @ApiOperation({ summary: 'Get due flashcards for review' })
  getDueCards(
    @Param('deckId') deckId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.flashcardsService.getDueCards(deckId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific flashcard' })
  findOne(@Param('id') id: string) {
    return this.flashcardsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a flashcard' })
  update(@Param('id') id: string, @Body() updateFlashcardDto: any) {
    return this.flashcardsService.update(id, updateFlashcardDto);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review a flashcard' })
  reviewCard(
    @Param('id') id: string,
    @Body('quality') quality: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.flashcardsService.reviewCard(user.userId, id, quality);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flashcard' })
  remove(@Param('id') id: string) {
    return this.flashcardsService.remove(id);
  }
}
