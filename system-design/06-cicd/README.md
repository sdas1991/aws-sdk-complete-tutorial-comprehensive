# System Design: CI/CD Pipeline

## Architecture
```
GitHub → CodePipeline → CodeBuild → ECS/Lambda → Production
                ↓
         CodeDeploy (Blue/Green)
```

## SDK Implementation
```typescript
import {
  CodePipelineClient,
  CreatePipelineCommand,
  StartPipelineExecutionCommand,
} from '@aws-sdk/client-codepipeline';

async function createCICDPipeline() {
  const client = new CodePipelineClient({});

  return await client.send(
    new CreatePipelineCommand({
      pipeline: {
        name: 'my-app-pipeline',
        roleArn: process.env.PIPELINE_ROLE_ARN!,
        stages: [
          {
            name: 'Source',
            actions: [
              {
                name: 'SourceAction',
                actionTypeId: {
                  category: 'Source',
                  owner: 'ThirdParty',
                  provider: 'GitHub',
                  version: '1',
                },
                outputArtifacts: [{ name: 'SourceOutput' }],
                configuration: {
                  Owner: 'my-org',
                  Repo: 'my-repo',
                  Branch: 'main',
                  OAuthToken: process.env.GITHUB_TOKEN!,
                },
              },
            ],
          },
          {
            name: 'Build',
            actions: [
              {
                name: 'BuildAction',
                actionTypeId: {
                  category: 'Build',
                  owner: 'AWS',
                  provider: 'CodeBuild',
                  version: '1',
                },
                inputArtifacts: [{ name: 'SourceOutput' }],
                outputArtifacts: [{ name: 'BuildOutput' }],
                configuration: {
                  ProjectName: 'my-build-project',
                },
              },
            ],
          },
          {
            name: 'Deploy',
            actions: [
              {
                name: 'DeployAction',
                actionTypeId: {
                  category: 'Deploy',
                  owner: 'AWS',
                  provider: 'ECS',
                  version: '1',
                },
                inputArtifacts: [{ name: 'BuildOutput' }],
                configuration: {
                  ClusterName: 'my-cluster',
                  ServiceName: 'my-service',
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
