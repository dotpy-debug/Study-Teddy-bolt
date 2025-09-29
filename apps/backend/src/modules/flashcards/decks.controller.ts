import {
  Controller,
  Get,
  Post,
  Put,
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
import { DecksService } from './decks.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';

@ApiTags('flashcard-decks')
@ApiBearerAuth()
@Controller('flashcards/decks')
@UseGuards(JwtAuthGuard)
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flashcard deck' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Deck created successfully',
  })
  async create(
    @CurrentUser() userId: string,
    @Body() createDeckDto: CreateDeckDto,
  ) {
    return this.decksService.create(userId, createDeckDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all decks for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Decks retrieved successfully',
  })
  async findAll(
    @CurrentUser() userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.decksService.findAll(userId, { page, limit });
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public decks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public decks retrieved successfully',
  })
  async findPublic(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return this.decksService.findPublicDecks({ page, limit, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific deck' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deck retrieved successfully',
  })
  async findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.decksService.findOne(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a deck' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deck updated successfully',
  })
  async update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() updateDeckDto: UpdateDeckDto,
  ) {
    return this.decksService.update(userId, id, updateDeckDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deck' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deck deleted successfully',
  })
  async remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.decksService.remove(userId, id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone a public deck' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Deck cloned successfully',
  })
  async clone(@CurrentUser() userId: string, @Param('id') deckId: string) {
    return this.decksService.cloneDeck(userId, deckId);
  }
}
