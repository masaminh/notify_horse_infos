import {
  Stack, StackProps, Duration, RemovalPolicy,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { ContextType } from './context_type';

// eslint-disable-next-line import/prefer-default-export
export class NotifyHorseInfosStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & { context: ContextType }) {
    super(scope, id, props);
    const horsesJsonBucket = s3.Bucket.fromBucketName(
      this,
      'HorsesJsonBucket',
      props.context.horsesJsonBucket,
    );

    const taskGetHorses = new sfnTasks.CallAwsService(this, 'GetHorses', {
      service: 's3',
      action: 'getObject',
      iamAction: 's3:GetObject',
      iamResources: [`${horsesJsonBucket.bucketArn}/*`],
      parameters: {
        Bucket: props.context.horsesJsonBucket,
        Key: props.context.horsesJsonKey,
      },
      resultSelector: {
        horsesJson: sfn.JsonPath.stringToJson(
          sfn.JsonPath.stringAt('$.Body'),
        ),
      },
      resultPath: '$.taskResult',
    });

    const apiUrlParameter = ssm.StringParameter.fromStringParameterName(
      this,
      'ApiUrlParameter',
      props.context.jvApiUrlParameter,
    );
    const taskGetApiUrl = new sfnTasks.CallAwsService(this, 'GetApiUrl', {
      service: 'ssm',
      action: 'getParameter',
      iamAction: 'ssm:GetParameter',
      iamResources: [apiUrlParameter.parameterArn],
      parameters: {
        Name: props.context.jvApiUrlParameter,
      },
      resultPath: '$.taskResult.jvApiUrl',
      resultSelector: {
        value: sfn.JsonPath.stringAt('$.Parameter.Value'),
      },
    });

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `${props.context.stackName}/JvEntryFunction`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const lambdaFunction = new lambdaNodeJs.NodejsFunction(this, 'JvEntryFunction', {
      entry: 'lambda/jv_entry/handler.ts',
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_20_X,
      logGroup,
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        sourceMap: true,
        forceDockerBundling: false,
      },
      timeout: Duration.minutes(1),
    });

    const taskJvEntry = new sfnTasks.LambdaInvoke(this, 'JvEntry', {
      lambdaFunction,
      payload: sfn.TaskInput.fromObject({
        time: sfn.JsonPath.stringAt('$.time'),
        jvApiUrl: sfn.JsonPath.stringAt('$.taskResult.jvApiUrl.value'),
        horses: sfn.JsonPath.stringAt('$.taskResult.horsesJson.horses'),
      }),
      payloadResponseOnly: true,
      resultPath: '$.taskResult',
    });

    const taskSendMessage = new sfnTasks.SqsSendMessage(this, 'SendMessage', {
      queue: sqs.Queue.fromQueueArn(this, 'Queue', props.context.queueArn),
      messageBody: sfn.TaskInput.fromObject({
        webhookname: props.context.webhookName,
        message: sfn.JsonPath.stringAt('$.taskResult.message'),
      }),
    });

    const taskEnd = new sfn.Pass(this, 'End');

    const stateMachine = new sfn.StateMachine(this, `${id}StateMachine`, {
      definitionBody: sfn.DefinitionBody.fromChainable(
        taskGetHorses
          .next(taskGetApiUrl)
          .next(taskJvEntry)
          .next(
            new sfn.Choice(this, 'Message is not null')
              .when(sfn.Condition.isNotNull('$.taskResult.message'), taskSendMessage)
              .otherwise(taskEnd),
          ),
      ),
      tracingEnabled: true,
    });

    // eslint-disable-next-line no-new
    new events.Rule(this, 'Rule', {
      schedule: events.Schedule.cron({ hour: '21', minute: '0' }),
      targets: [new eventsTargets.SfnStateMachine(stateMachine)],
      enabled: true,
    });
  }
}
