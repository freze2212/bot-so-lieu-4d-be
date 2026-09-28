import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService, Employee } from '../database/database.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(): Promise<Employee[]> {
    return await this.db.getEmployees();
  }

  async create(name: string, code: string): Promise<Employee> {
    if (!name || !code) {
      throw new BadRequestException('Vui lòng nhập Tên nhân viên và Mã hậu đài');
    }
    const existing = await this.db.getEmployeeByCode(code);
    if (existing) {
      throw new BadRequestException(`Mã hậu đài "${code}" đã tồn tại cho nhân viên ${existing.name}`);
    }
    return await this.db.addEmployee(name, code);
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const deleted = await this.db.deleteEmployee(id);
    if (!deleted) {
      throw new NotFoundException(`Không tìm thấy nhân viên hoặc báo cáo tương ứng với "${id}" để xóa`);
    }
    return { success: true, message: 'Đã xóa nhân viên và toàn bộ thống kê thành công' };
  }
}
