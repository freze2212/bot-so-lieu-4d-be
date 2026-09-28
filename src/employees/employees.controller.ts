import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async getAll() {
    return await this.employeesService.getAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: { name: string; code: string }) {
    return await this.employeesService.create(body.name, body.code);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.employeesService.delete(id);
  }
}
