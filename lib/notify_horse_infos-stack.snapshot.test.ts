import { Template } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';
import { NotifyHorseInfosStack } from './notify_horse_infos-stack';
import { ContextType } from './context_type';

describe('NotifyHorseInfosStack Snapshot Tests', () => {
  let app: App;
  let stack: NotifyHorseInfosStack;
  let context: ContextType;

  beforeEach(() => {
    app = new App();
    context = {
      stackName: 'test-stack',
      horsesJsonBucket: 'test-horses-bucket',
      horsesJsonKey: 'horses.json',
      webhookName: 'test-webhook',
      queueArn: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
      apiUrlParameters: [
        '/test/api/url1',
        '/test/api/url2',
      ],
    };
    stack = new NotifyHorseInfosStack(app, 'TestStack', {
      context,
    });
  });

  test('should match snapshot for complete stack', () => {
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('should match snapshot for Lambda function configuration', () => {
    const template = Template.fromStack(stack);
    const lambdaFunctions = template.findResources('AWS::Lambda::Function');
    expect(lambdaFunctions).toMatchSnapshot();
  });

  test('should match snapshot for Step Functions state machine', () => {
    const template = Template.fromStack(stack);
    const stateMachines = template.findResources('AWS::StepFunctions::StateMachine');
    expect(stateMachines).toMatchSnapshot();
  });

  test('should match snapshot for EventBridge rule', () => {
    const template = Template.fromStack(stack);
    const eventRules = template.findResources('AWS::Events::Rule');
    expect(eventRules).toMatchSnapshot();
  });

  test('should match snapshot for CloudWatch Log Group', () => {
    const template = Template.fromStack(stack);
    const logGroups = template.findResources('AWS::Logs::LogGroup');
    expect(logGroups).toMatchSnapshot();
  });

  test('should match snapshot for IAM roles and policies', () => {
    const template = Template.fromStack(stack);
    const iamRoles = template.findResources('AWS::IAM::Role');
    const iamPolicies = template.findResources('AWS::IAM::Policy');
    expect({ roles: iamRoles, policies: iamPolicies }).toMatchSnapshot();
  });
});
