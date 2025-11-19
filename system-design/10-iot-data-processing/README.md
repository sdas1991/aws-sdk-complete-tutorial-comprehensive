# System Design: IoT Data Processing Platform

## Architecture
```
IoT Devices → IoT Core → Kinesis → Lambda → TimestreamDB
                 ↓                              ↓
           Device Shadow                    QuickSight
                 ↓
           DynamoDB
```

## SDK Implementation
```typescript
import { IoTClient, CreateThingCommand, AttachPolicyCommand } from '@aws-sdk/client-iot';
import { TimestreamWriteClient, WriteRecordsCommand } from '@aws-sdk/client-timestream-write';

// Register IoT device
async function registerIoTDevice(deviceId: string) {
  const iotClient = new IoTClient({});

  return await iotClient.send(
    new CreateThingCommand({
      thingName: deviceId,
      attributePayload: {
        attributes: {
          deviceType: 'sensor',
          location: 'warehouse-1',
        },
      },
    })
  );
}

// Write time-series data to Timestream
async function writeTimeseriesData(deviceId: string, metrics: any[]) {
  const client = new TimestreamWriteClient({});

  const records = metrics.map((metric) => ({
    Dimensions: [
      { Name: 'device_id', Value: deviceId },
      { Name: 'sensor_type', Value: metric.type },
    ],
    MeasureName: metric.name,
    MeasureValue: metric.value.toString(),
    MeasureValueType: 'DOUBLE',
    Time: Date.now().toString(),
    TimeUnit: 'MILLISECONDS',
  }));

  return await client.send(
    new WriteRecordsCommand({
      DatabaseName: 'iot-database',
      TableName: 'sensor-data',
      Records: records,
    })
  );
}

// IoT Rule to process incoming messages
const iotRule = {
  sql: "SELECT * FROM 'sensors/+/data' WHERE temperature > 80",
  actions: [
    {
      lambda: {
        functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:alert-handler',
      },
    },
    {
      firehose: {
        deliveryStreamName: 'iot-data-stream',
        separator: '\n',
      },
    },
  ],
};
```

## Features
- **Real-time Processing**: Sub-second latency
- **Device Management**: 1M+ concurrent connections
- **Time-Series Storage**: Optimized for IoT data
- **Analytics**: Real-time dashboards
- **Alerts**: Rule-based notifications
