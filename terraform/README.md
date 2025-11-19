# Terraform Integration Examples

## Overview

This directory contains Terraform modules and examples for provisioning AWS infrastructure that integrates with the AWS SDK examples in this repository.

---

## Directory Structure

```
terraform/
├── modules/              # Reusable Terraform modules
│   ├── iam/             # IAM roles, policies, users
│   ├── s3/              # S3 buckets and configurations
│   ├── lambda/          # Lambda functions
│   ├── dynamodb/        # DynamoDB tables
│   ├── vpc/             # VPC and networking
│   └── eks/             # EKS clusters
├── environments/        # Environment-specific configurations
│   ├── dev/            # Development environment
│   ├── staging/        # Staging environment
│   └── production/     # Production environment
└── examples/           # Complete infrastructure examples
    ├── serverless-app/ # Serverless application
    ├── microservices/  # Microservices platform
    └── data-pipeline/  # Data processing pipeline
```

---

## Getting Started

### Prerequisites

```bash
# Install Terraform
brew install terraform  # macOS
# or
curl -LO https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip

# Configure AWS credentials
aws configure
```

### Initialize Terraform

```bash
cd terraform/environments/dev
terraform init
```

### Plan and Apply

```bash
# Preview changes
terraform plan -var-file="terraform.tfvars"

# Apply changes
terraform apply -var-file="terraform.tfvars"
```

---

## Module Examples

### IAM Module

**File:** `modules/iam/main.tf`

```hcl
# modules/iam/main.tf

variable "role_name" {
  description = "Name of the IAM role"
  type        = string
}

variable "assume_role_policy" {
  description = "Assume role policy document"
  type        = string
}

variable "managed_policy_arns" {
  description = "List of managed policy ARNs to attach"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# IAM Role
resource "aws_iam_role" "this" {
  name               = var.role_name
  assume_role_policy = var.assume_role_policy
  tags               = var.tags
}

# Attach managed policies
resource "aws_iam_role_policy_attachment" "managed_policies" {
  for_each = toset(var.managed_policy_arns)

  role       = aws_iam_role.this.name
  policy_arn = each.value
}

# Outputs
output "role_arn" {
  description = "ARN of the IAM role"
  value       = aws_iam_role.this.arn
}

output "role_name" {
  description = "Name of the IAM role"
  value       = aws_iam_role.this.name
}
```

**Usage:**

```hcl
module "lambda_execution_role" {
  source = "../../modules/iam"

  role_name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
  ]

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

---

### S3 Module

**File:** `modules/s3/main.tf`

```hcl
# modules/s3/main.tf

variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "versioning_enabled" {
  description = "Enable versioning"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "Lifecycle rules for the bucket"
  type = list(object({
    id      = string
    enabled = bool
    transitions = list(object({
      days          = number
      storage_class = string
    }))
    expiration_days = number
  }))
  default = []
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}

# S3 Bucket
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
  tags   = var.tags
}

# Versioning
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rules
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count  = length(var.lifecycle_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  dynamic "rule" {
    for_each = var.lifecycle_rules

    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      dynamic "transition" {
        for_each = rule.value.transitions

        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      expiration {
        days = rule.value.expiration_days
      }
    }
  }
}

# Outputs
output "bucket_id" {
  value = aws_s3_bucket.this.id
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

output "bucket_domain_name" {
  value = aws_s3_bucket.this.bucket_domain_name
}
```

---

### Lambda Module

**File:** `modules/lambda/main.tf`

```hcl
# modules/lambda/main.tf

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs18.x"
}

variable "handler" {
  description = "Lambda handler"
  type        = string
  default     = "index.handler"
}

variable "role_arn" {
  description = "IAM role ARN for Lambda execution"
  type        = string
}

variable "source_code_path" {
  description = "Path to Lambda source code"
  type        = string
}

variable "environment_variables" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "memory_size" {
  description = "Memory size in MB"
  type        = number
  default     = 128
}

variable "timeout" {
  description = "Timeout in seconds"
  type        = number
  default     = 3
}

variable "tags" {
  description = "Tags"
  type        = map(string)
  default     = {}
}

# Package Lambda code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = var.source_code_path
  output_path = "${path.module}/lambda_function.zip"
}

# Lambda Function
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = var.role_arn
  handler       = var.handler
  runtime       = var.runtime

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  memory_size = var.memory_size
  timeout     = var.timeout

  environment {
    variables = var.environment_variables
  }

  tracing_config {
    mode = "Active"
  }

  tags = var.tags
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 7

  tags = var.tags
}

# Outputs
output "function_arn" {
  value = aws_lambda_function.this.arn
}

output "function_name" {
  value = aws_lambda_function.this.function_name
}

output "invoke_arn" {
  value = aws_lambda_function.this.invoke_arn
}
```

---

### DynamoDB Module

**File:** `modules/dynamodb/main.tf`

```hcl
# modules/dynamodb/main.tf

variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "hash_key" {
  description = "Hash key attribute name"
  type        = string
}

variable "range_key" {
  description = "Range key attribute name (optional)"
  type        = string
  default     = null
}

variable "attributes" {
  description = "List of attributes"
  type = list(object({
    name = string
    type = string
  }))
}

variable "global_secondary_indexes" {
  description = "Global secondary indexes"
  type = list(object({
    name            = string
    hash_key        = string
    range_key       = string
    projection_type = string
  }))
  default = []
}

variable "billing_mode" {
  description = "Billing mode (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "point_in_time_recovery" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

variable "stream_enabled" {
  description = "Enable DynamoDB streams"
  type        = bool
  default     = false
}

variable "stream_view_type" {
  description = "Stream view type"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"
}

variable "tags" {
  description = "Tags"
  type        = map(string)
  default     = {}
}

# DynamoDB Table
resource "aws_dynamodb_table" "this" {
  name         = var.table_name
  billing_mode = var.billing_mode
  hash_key     = var.hash_key
  range_key    = var.range_key

  dynamic "attribute" {
    for_each = var.attributes

    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  dynamic "global_secondary_index" {
    for_each = var.global_secondary_indexes

    content {
      name            = global_secondary_index.value.name
      hash_key        = global_secondary_index.value.hash_key
      range_key       = global_secondary_index.value.range_key
      projection_type = global_secondary_index.value.projection_type
    }
  }

  point_in_time_recovery {
    enabled = var.point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }

  stream_enabled   = var.stream_enabled
  stream_view_type = var.stream_enabled ? var.stream_view_type : null

  tags = var.tags
}

# Outputs
output "table_name" {
  value = aws_dynamodb_table.this.name
}

output "table_arn" {
  value = aws_dynamodb_table.this.arn
}

output "stream_arn" {
  value = var.stream_enabled ? aws_dynamodb_table.this.stream_arn : null
}
```

---

## Complete Example: Serverless Application

**File:** `examples/serverless-app/main.tf`

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "serverless-app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "serverless-app"
      ManagedBy   = "terraform"
    }
  }
}

# Variables
variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "dev"
}

variable "app_name" {
  default = "my-serverless-app"
}

# IAM Role for Lambda
module "lambda_role" {
  source = "../../modules/iam"

  role_name = "${var.app_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
  ]
}

# DynamoDB Table
module "dynamodb_table" {
  source = "../../modules/dynamodb"

  table_name = "${var.app_name}-table"
  hash_key   = "pk"
  range_key  = "sk"

  attributes = [
    { name = "pk", type = "S" },
    { name = "sk", type = "S" },
    { name = "gsi1pk", type = "S" },
    { name = "gsi1sk", type = "S" }
  ]

  global_secondary_indexes = [{
    name            = "GSI1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }]

  stream_enabled = true
}

# Lambda Function
module "api_function" {
  source = "../../modules/lambda"

  function_name      = "${var.app_name}-api"
  source_code_path   = "${path.module}/lambda/api"
  role_arn           = module.lambda_role.role_arn
  memory_size        = 256
  timeout            = 30

  environment_variables = {
    TABLE_NAME = module.dynamodb_table.table_name
    ENVIRONMENT = var.environment
  }
}

# S3 Bucket for Frontend
module "frontend_bucket" {
  source = "../../modules/s3"

  bucket_name        = "${var.app_name}-frontend"
  versioning_enabled = true

  lifecycle_rules = [{
    id      = "delete-old-versions"
    enabled = true
    transitions = []
    expiration_days = 90
  }]
}

# Outputs
output "lambda_function_arn" {
  value = module.api_function.function_arn
}

output "dynamodb_table_name" {
  value = module.dynamodb_table.table_name
}

output "frontend_bucket_name" {
  value = module.frontend_bucket.bucket_id
}
```

---

## Best Practices

1. **Use Modules**: Reusable, testable, versioned
2. **Remote State**: S3 + DynamoDB locking
3. **Workspaces**: Separate environments
4. **Variables**: Externalize configuration
5. **Outputs**: Export important values
6. **Version Pinning**: Lock provider versions
7. **Tag Everything**: Cost allocation and organization

---

## Integration with AWS SDK

After provisioning infrastructure with Terraform, use the SDK examples with the created resources:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Use Terraform output for table name
const tableName = process.env.TERRAFORM_TABLE_NAME || 'my-serverless-app-table';

const client = new DynamoDBClient({});
// ... use the SDK with Terraform-provisioned resources
```

---

## Next Steps

1. Review module documentation
2. Customize for your use case
3. Test in dev environment
4. Apply to production with approval workflow
