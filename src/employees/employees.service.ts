import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService, Employee } from '../database/database.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly db: DatabaseService) {}

  getAll(): Employee[] {
    return this.db.getEmployees();
  }

  create(name: string, code: string): Employee {
    if (!name || !code) {
      throw new BadRequestException('Vui lòng nhập Tên nhân viên và Mã hậu đài');
    }
    const existing = this.db.getEmployeeByCode(code);
    if (existing) {
      throw new BadRequestException(`Mã hậu đài "${code}" đã tồn tại cho nhân viên ${existing.name}`);
    }
    return this.db.addEmployee(name, code);
  }

  delete(id: string): { success: boolean; message: string } {
    this.db.deleteEmployee(id);
    return { success: true, message: 'Đã xóa nhân viên và toàn bộ thống kê thành công' };
  }
}
