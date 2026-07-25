import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  getAll() {
    return this.employeesService.getAll();
  }

  @Post()
  create(@Body() body: { name: string; code: string }) {
    return this.employeesService.create(body.name, body.code);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.employeesService.delete(id);
  }
}
