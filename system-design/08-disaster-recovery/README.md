# System Design: Disaster Recovery (Multi-Region)

## Architecture (RPO: 1 hour, RTO: 4 hours)
```
Primary Region (us-east-1)          Secondary Region (us-west-2)
       │                                    │
   ┌───▼────┐                          ┌───▼────┐
   │ RDS    │──────Replication────────▶│ RDS    │
   │Primary │                          │Standby │
   └────────┘                          └────────┘
       │                                    │
   ┌───▼────┐                          ┌───▼────┐
   │   S3   │──────CRR (15min)────────▶│   S3   │
   └────────┘                          └────────┘
```

## SDK Implementation
```typescript
import { BackupClient, CreateBackupPlanCommand, StartBackupJobCommand } from '@aws-sdk/client-backup';

async function createDRBackupPlan() {
  const client = new BackupClient({});

  return await client.send(
    new CreateBackupPlanCommand({
      BackupPlan: {
        BackupPlanName: 'disaster-recovery-plan',
        Rules: [
          {
            RuleName: 'daily-backup',
            TargetBackupVault: 'default',
            ScheduleExpression: 'cron(0 5 ? * * *)',
            StartWindowMinutes: 60,
            CompletionWindowMinutes: 120,
            Lifecycle: {
              DeleteAfterDays: 35,
              MoveToColdStorageAfterDays: 7,
            },
            CopyActions: [
              {
                DestinationBackupVaultArn:
                  'arn:aws:backup:us-west-2:123456789012:backup-vault:default',
                Lifecycle: {
                  DeleteAfterDays: 35,
                },
              },
            ],
          },
        ],
      },
    })
  );
}
```

## Recovery Procedures
1. **Detection**: CloudWatch alarms trigger SNS
2. **Assessment**: Runbooks define RTO/RPO
3. **Failover**: Route 53 health check triggers
4. **Recovery**: Automated scripts restore from backup
5. **Validation**: Testing and verification
