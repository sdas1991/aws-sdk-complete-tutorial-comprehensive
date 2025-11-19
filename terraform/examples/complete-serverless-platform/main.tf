# ==============================================================================
# Complete Serverless Platform Example
# Demonstrates: API Gateway + Lambda + DynamoDB + EventBridge + SQS
# ==============================================================================

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "serverless-platform/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "serverless-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
      CostCenter  = "engineering"
    }
  }
}

# ==============================================================================
# Variables
# ==============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "serverless-platform"
}

# ==============================================================================
# Data Sources
# ==============================================================================

data "aws_caller_identity" "current" {}

# ==============================================================================
# DynamoDB Tables
# ==============================================================================

module "users_table" {
  source = "../../modules/dynamodb"

  table_name = "${var.project_name}-users-${var.environment}"
  hash_key   = "userId"
  range_key  = "sk"

  attributes = [
    { name = "userId", type = "S" },
    { name = "sk", type = "S" },
    { name = "email", type = "S" },
    { name = "createdAt", type = "S" }
  ]

  global_secondary_indexes = [
    {
      name            = "EmailIndex"
      hash_key        = "email"
      range_key       = "createdAt"
      projection_type = "ALL"
    }
  ]

  billing_mode            = "PAY_PER_REQUEST"
  point_in_time_recovery  = true
  stream_enabled          = true
  stream_view_type        = "NEW_AND_OLD_IMAGES"

  tags = {
    Name = "${var.project_name}-users"
  }
}

module "orders_table" {
  source = "../../modules/dynamodb"

  table_name = "${var.project_name}-orders-${var.environment}"
  hash_key   = "orderId"
  range_key  = "customerId"

  attributes = [
    { name = "orderId", type = "S" },
    { name = "customerId", type = "S" },
    { name = "status", type = "S" },
    { name = "createdAt", type = "S" }
  ]

  global_secondary_indexes = [
    {
      name            = "CustomerIndex"
      hash_key        = "customerId"
      range_key       = "createdAt"
      projection_type = "ALL"
    },
    {
      name            = "StatusIndex"
      hash_key        = "status"
      range_key       = "createdAt"
      projection_type = "ALL"
    }
  ]

  stream_enabled = true

  tags = {
    Name = "${var.project_name}-orders"
  }
}

# ==============================================================================
# Lambda Functions
# ==============================================================================

# API Lambda for user operations
module "user_api_lambda" {
  source = "../../modules/lambda"

  function_name    = "${var.project_name}-user-api-${var.environment}"
  source_code_path = "${path.module}/lambda/user-api"
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  role_arn         = aws_iam_role.user_api_lambda.arn
  memory_size      = 512
  timeout          = 30

  environment_variables = {
    USERS_TABLE_NAME = module.users_table.table_name
    ENVIRONMENT      = var.environment
    POWERTOOLS_SERVICE_NAME = "user-api"
  }

  tags = {
    Function = "user-api"
  }
}

# Order processing Lambda
module "order_processor_lambda" {
  source = "../../modules/lambda"

  function_name    = "${var.project_name}-order-processor-${var.environment}"
  source_code_path = "${path.module}/lambda/order-processor"
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  role_arn         = aws_iam_role.order_processor_lambda.arn
  memory_size      = 1024
  timeout          = 60

  environment_variables = {
    ORDERS_TABLE_NAME = module.orders_table.table_name
    EVENT_BUS_NAME    = aws_cloudwatch_event_bus.main.name
    ENVIRONMENT       = var.environment
  }

  tags = {
    Function = "order-processor"
  }
}

# ==============================================================================
# IAM Roles for Lambda
# ==============================================================================

# User API Lambda Role
resource "aws_iam_role" "user_api_lambda" {
  name = "${var.project_name}-user-api-lambda-${var.environment}"

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
}

resource "aws_iam_role_policy_attachment" "user_api_lambda_basic" {
  role       = aws_iam_role.user_api_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "user_api_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.user_api_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          module.users_table.table_arn,
          "${module.users_table.table_arn}/index/*"
        ]
      }
    ]
  })
}

# Order Processor Lambda Role
resource "aws_iam_role" "order_processor_lambda" {
  name = "${var.project_name}-order-processor-lambda-${var.environment}"

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
}

resource "aws_iam_role_policy_attachment" "order_processor_lambda_basic" {
  role       = aws_iam_role.order_processor_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "order_processor_permissions" {
  name = "order-processor-permissions"
  role = aws_iam_role.order_processor_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          module.orders_table.table_arn,
          "${module.orders_table.table_arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = aws_cloudwatch_event_bus.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.order_processing.arn
      }
    ]
  })
}

# ==============================================================================
# API Gateway
# ==============================================================================

module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name = "${var.project_name}-api-${var.environment}"
  api_type = "HTTP"

  cors_configuration = {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 300
  }

  routes = [
    {
      route_key        = "GET /users"
      integration_type = "AWS_PROXY"
      integration_uri  = module.user_api_lambda.invoke_arn
    },
    {
      route_key        = "GET /users/{userId}"
      integration_type = "AWS_PROXY"
      integration_uri  = module.user_api_lambda.invoke_arn
    },
    {
      route_key        = "POST /users"
      integration_type = "AWS_PROXY"
      integration_uri  = module.user_api_lambda.invoke_arn
    },
    {
      route_key        = "PUT /users/{userId}"
      integration_type = "AWS_PROXY"
      integration_uri  = module.user_api_lambda.invoke_arn
    },
    {
      route_key        = "DELETE /users/{userId}"
      integration_type = "AWS_PROXY"
      integration_uri  = module.user_api_lambda.invoke_arn
    }
  ]

  stage_name = var.environment

  throttle_settings = {
    rate_limit  = 10000
    burst_limit = 5000
  }

  tags = {
    Name = "${var.project_name}-api"
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.user_api_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.api_gateway.api_arn}/*/*"
}

# ==============================================================================
# EventBridge
# ==============================================================================

resource "aws_cloudwatch_event_bus" "main" {
  name = "${var.project_name}-events-${var.environment}"

  tags = {
    Name = "${var.project_name}-event-bus"
  }
}

# Event rule for order created
resource "aws_cloudwatch_event_rule" "order_created" {
  name           = "${var.project_name}-order-created-${var.environment}"
  description    = "Trigger on order created events"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    source      = ["order-service"]
    detail-type = ["OrderCreated"]
  })
}

resource "aws_cloudwatch_event_target" "order_created_lambda" {
  rule           = aws_cloudwatch_event_rule.order_created.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  target_id      = "order-processor-lambda"
  arn            = module.order_processor_lambda.function_arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.order_processor_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.order_created.arn
}

# ==============================================================================
# SQS Queues
# ==============================================================================

resource "aws_sqs_queue" "order_processing_dlq" {
  name                      = "${var.project_name}-order-processing-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${var.project_name}-order-processing-dlq"
  }
}

resource "aws_sqs_queue" "order_processing" {
  name                       = "${var.project_name}-order-processing-${var.environment}"
  delay_seconds              = 0
  max_message_size           = 262144 # 256 KB
  message_retention_seconds  = 345600 # 4 days
  receive_wait_time_seconds  = 10     # Long polling
  visibility_timeout_seconds = 300    # 5 minutes

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_processing_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "${var.project_name}-order-processing"
  }
}

# ==============================================================================
# CloudWatch Alarms
# ==============================================================================

resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${var.project_name}-api-5xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API Gateway 5xx errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = module.api_gateway.api_id
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda function errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = module.user_api_lambda.function_name
  }
}

# ==============================================================================
# Outputs
# ==============================================================================

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.stage_invoke_url
}

output "users_table_name" {
  description = "DynamoDB users table name"
  value       = module.users_table.table_name
}

output "orders_table_name" {
  description = "DynamoDB orders table name"
  value       = module.orders_table.table_name
}

output "event_bus_name" {
  description = "EventBridge event bus name"
  value       = aws_cloudwatch_event_bus.main.name
}

output "order_processing_queue_url" {
  description = "SQS order processing queue URL"
  value       = aws_sqs_queue.order_processing.url
}

output "user_api_lambda_arn" {
  description = "User API Lambda function ARN"
  value       = module.user_api_lambda.function_arn
}
