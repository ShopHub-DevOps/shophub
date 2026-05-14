import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';

describe('Database integration (Testcontainers + pg)', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    client = new Client({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
    await container?.stop();
  });

  it('runs a trivial query against the spun-up Postgres', async () => {
    const result = await client.query<{ one: number }>('SELECT 1 AS one');
    expect(result.rows[0]).toEqual({ one: 1 });
  });

  it('can create a table, insert rows, and read them back', async () => {
    await client.query(
      'CREATE TABLE platform_smoke (id SERIAL PRIMARY KEY, name TEXT NOT NULL)',
    );
    await client.query(
      "INSERT INTO platform_smoke (name) VALUES ('alpha'), ('beta')",
    );

    const result = await client.query<{ id: number; name: string }>(
      'SELECT id, name FROM platform_smoke ORDER BY id',
    );

    expect(result.rows).toEqual([
      { id: 1, name: 'alpha' },
      { id: 2, name: 'beta' },
    ]);
  });
});
