import { MigrationInterface, QueryRunner } from 'typeorm';

// Who opened which chart, who cancelled which appointment, who changed whose role.
// No foreign key to users: the trail has to outlive the account it points at.
export class AuditLog1710000000016 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE audit_log (
        id uuid PRIMARY KEY,
        occurred_at timestamptz NOT NULL,
        actor_id uuid,
        actor_role varchar(20),
        action varchar(40) NOT NULL,
        target_type varchar(20) NOT NULL,
        target_id varchar(64) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb
      )
    `);
    await q.query(`CREATE INDEX audit_log_occurred_idx ON audit_log(occurred_at DESC)`);
    await q.query(`CREATE INDEX audit_log_actor_idx ON audit_log(actor_id)`);
    await q.query(`CREATE INDEX audit_log_action_idx ON audit_log(action)`);
    await q.query(`CREATE INDEX audit_log_target_idx ON audit_log(target_id)`);
  }

  async down(q: QueryRunner) {
    await q.query(`DROP TABLE audit_log`);
  }
}
