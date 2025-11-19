# ==============================================================================
# API Gateway Module
# Supports REST API, HTTP API, and WebSocket API
# ==============================================================================

variable "api_name" {
  description = "Name of the API Gateway"
  type        = string
}

variable "api_type" {
  description = "Type of API (REST, HTTP, or WEBSOCKET)"
  type        = string
  default     = "HTTP"
  validation {
    condition     = contains(["REST", "HTTP", "WEBSOCKET"], var.api_type)
    error_message = "API type must be REST, HTTP, or WEBSOCKET"
  }
}

variable "protocol_type" {
  description = "Protocol type for HTTP API"
  type        = string
  default     = "HTTP"
}

variable "cors_configuration" {
  description = "CORS configuration"
  type = object({
    allow_origins = list(string)
    allow_methods = list(string)
    allow_headers = list(string)
    max_age       = number
  })
  default = null
}

variable "authorizer_config" {
  description = "JWT or Lambda authorizer configuration"
  type = object({
    type          = string # JWT or LAMBDA
    identity_source = list(string)
    jwt_configuration = optional(object({
      audience = list(string)
      issuer   = string
    }))
    lambda_arn = optional(string)
  })
  default = null
}

variable "routes" {
  description = "API routes configuration"
  type = list(object({
    route_key         = string
    integration_type  = string # AWS_PROXY, HTTP_PROXY, AWS, HTTP, MOCK
    integration_uri   = string
    integration_method = optional(string)
    authorization_type = optional(string)
    authorizer_id     = optional(string)
  }))
  default = []
}

variable "stage_name" {
  description = "Deployment stage name"
  type        = string
  default     = "prod"
}

variable "throttle_settings" {
  description = "Throttle settings"
  type = object({
    rate_limit  = number
    burst_limit = number
  })
  default = {
    rate_limit  = 10000
    burst_limit = 5000
  }
}

variable "access_log_settings" {
  description = "Access logging configuration"
  type = object({
    destination_arn = string
    format         = string
  })
  default = null
}

variable "custom_domain" {
  description = "Custom domain configuration"
  type = object({
    domain_name     = string
    certificate_arn = string
  })
  default = null
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# ==============================================================================
# HTTP API
# ==============================================================================

resource "aws_apigatewayv2_api" "http_api" {
  count = var.api_type == "HTTP" ? 1 : 0

  name          = var.api_name
  protocol_type = var.protocol_type
  description   = "HTTP API for ${var.api_name}"

  dynamic "cors_configuration" {
    for_each = var.cors_configuration != null ? [var.cors_configuration] : []
    content {
      allow_origins = cors_configuration.value.allow_origins
      allow_methods = cors_configuration.value.allow_methods
      allow_headers = cors_configuration.value.allow_headers
      max_age       = cors_configuration.value.max_age
    }
  }

  tags = var.tags
}

# JWT Authorizer for HTTP API
resource "aws_apigatewayv2_authorizer" "jwt_authorizer" {
  count = var.api_type == "HTTP" && var.authorizer_config != null && var.authorizer_config.type == "JWT" ? 1 : 0

  api_id           = aws_apigatewayv2_api.http_api[0].id
  authorizer_type  = "JWT"
  identity_sources = var.authorizer_config.identity_source
  name             = "${var.api_name}-jwt-authorizer"

  jwt_configuration {
    audience = var.authorizer_config.jwt_configuration.audience
    issuer   = var.authorizer_config.jwt_configuration.issuer
  }
}

# Lambda Authorizer for HTTP API
resource "aws_apigatewayv2_authorizer" "lambda_authorizer" {
  count = var.api_type == "HTTP" && var.authorizer_config != null && var.authorizer_config.type == "LAMBDA" ? 1 : 0

  api_id                            = aws_apigatewayv2_api.http_api[0].id
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = var.authorizer_config.lambda_arn
  identity_sources                  = var.authorizer_config.identity_source
  name                              = "${var.api_name}-lambda-authorizer"
  authorizer_payload_format_version = "2.0"
  enable_simple_responses          = true
}

# Integrations for HTTP API
resource "aws_apigatewayv2_integration" "http_integration" {
  for_each = var.api_type == "HTTP" ? { for idx, route in var.routes : idx => route } : {}

  api_id           = aws_apigatewayv2_api.http_api[0].id
  integration_type = each.value.integration_type
  integration_uri  = each.value.integration_uri

  integration_method        = each.value.integration_method
  payload_format_version    = each.value.integration_type == "AWS_PROXY" ? "2.0" : "1.0"
  timeout_milliseconds      = 30000
  connection_type           = "INTERNET"
}

# Routes for HTTP API
resource "aws_apigatewayv2_route" "http_route" {
  for_each = var.api_type == "HTTP" ? { for idx, route in var.routes : idx => route } : {}

  api_id    = aws_apigatewayv2_api.http_api[0].id
  route_key = each.value.route_key

  target             = "integrations/${aws_apigatewayv2_integration.http_integration[each.key].id}"
  authorization_type = each.value.authorization_type != null ? each.value.authorization_type : "NONE"
  authorizer_id      = each.value.authorizer_id
}

# Stage for HTTP API
resource "aws_apigatewayv2_stage" "http_stage" {
  count = var.api_type == "HTTP" ? 1 : 0

  api_id      = aws_apigatewayv2_api.http_api[0].id
  name        = var.stage_name
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = var.throttle_settings.rate_limit
    throttling_burst_limit = var.throttle_settings.burst_limit
    detailed_metrics_enabled = true
  }

  dynamic "access_log_settings" {
    for_each = var.access_log_settings != null ? [var.access_log_settings] : []
    content {
      destination_arn = access_log_settings.value.destination_arn
      format         = access_log_settings.value.format
    }
  }

  tags = var.tags
}

# ==============================================================================
# REST API
# ==============================================================================

resource "aws_api_gateway_rest_api" "rest_api" {
  count = var.api_type == "REST" ? 1 : 0

  name        = var.api_name
  description = "REST API for ${var.api_name}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

# ==============================================================================
# WebSocket API
# ==============================================================================

resource "aws_apigatewayv2_api" "websocket_api" {
  count = var.api_type == "WEBSOCKET" ? 1 : 0

  name                       = var.api_name
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
  description                = "WebSocket API for ${var.api_name}"

  tags = var.tags
}

# WebSocket Routes
resource "aws_apigatewayv2_integration" "websocket_integration" {
  for_each = var.api_type == "WEBSOCKET" ? { for idx, route in var.routes : idx => route } : {}

  api_id           = aws_apigatewayv2_api.websocket_api[0].id
  integration_type = each.value.integration_type
  integration_uri  = each.value.integration_uri

  integration_method = each.value.integration_method
}

resource "aws_apigatewayv2_route" "websocket_route" {
  for_each = var.api_type == "WEBSOCKET" ? { for idx, route in var.routes : idx => route } : {}

  api_id    = aws_apigatewayv2_api.websocket_api[0].id
  route_key = each.value.route_key

  target = "integrations/${aws_apigatewayv2_integration.websocket_integration[each.key].id}"
}

# WebSocket Stage
resource "aws_apigatewayv2_stage" "websocket_stage" {
  count = var.api_type == "WEBSOCKET" ? 1 : 0

  api_id      = aws_apigatewayv2_api.websocket_api[0].id
  name        = var.stage_name
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = var.throttle_settings.rate_limit
    throttling_burst_limit = var.throttle_settings.burst_limit
  }

  tags = var.tags
}

# ==============================================================================
# Custom Domain (Optional)
# ==============================================================================

resource "aws_apigatewayv2_domain_name" "custom_domain" {
  count = var.custom_domain != null && var.api_type != "REST" ? 1 : 0

  domain_name = var.custom_domain.domain_name

  domain_name_configuration {
    certificate_arn = var.custom_domain.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = var.tags
}

resource "aws_apigatewayv2_api_mapping" "custom_domain_mapping" {
  count = var.custom_domain != null && var.api_type == "HTTP" ? 1 : 0

  api_id      = aws_apigatewayv2_api.http_api[0].id
  domain_name = aws_apigatewayv2_domain_name.custom_domain[0].id
  stage       = aws_apigatewayv2_stage.http_stage[0].id
}

# ==============================================================================
# Outputs
# ==============================================================================

output "api_id" {
  description = "API Gateway ID"
  value = var.api_type == "HTTP" ? aws_apigatewayv2_api.http_api[0].id : (
    var.api_type == "WEBSOCKET" ? aws_apigatewayv2_api.websocket_api[0].id :
    aws_api_gateway_rest_api.rest_api[0].id
  )
}

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value = var.api_type == "HTTP" ? aws_apigatewayv2_api.http_api[0].api_endpoint : (
    var.api_type == "WEBSOCKET" ? aws_apigatewayv2_api.websocket_api[0].api_endpoint :
    aws_api_gateway_rest_api.rest_api[0].execution_arn
  )
}

output "api_arn" {
  description = "API Gateway ARN"
  value = var.api_type == "HTTP" ? aws_apigatewayv2_api.http_api[0].arn : (
    var.api_type == "WEBSOCKET" ? aws_apigatewayv2_api.websocket_api[0].arn :
    aws_api_gateway_rest_api.rest_api[0].arn
  )
}

output "stage_invoke_url" {
  description = "Stage invocation URL"
  value = var.api_type == "HTTP" ? aws_apigatewayv2_stage.http_stage[0].invoke_url : (
    var.api_type == "WEBSOCKET" ? aws_apigatewayv2_stage.websocket_stage[0].invoke_url :
    null
  )
}

output "custom_domain_name" {
  description = "Custom domain name (if configured)"
  value       = var.custom_domain != null ? var.custom_domain.domain_name : null
}
