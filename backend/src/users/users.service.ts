import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        walletAddress: true,
      },
    });
  }

  findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.users.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
  }

  createWithPassword(email: string, passwordHash: string): Promise<User> {
    const user = this.users.create({ email, passwordHash });
    return this.users.save(user);
  }

  createWithWallet(walletAddress: string): Promise<User> {
    const user = this.users.create({ walletAddress });
    return this.users.save(user);
  }
}
