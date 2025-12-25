import { Template } from 'aws-cdk-lib/assertions'
import { App } from 'aws-cdk-lib'
import { NotifyHorseInfosStack } from './notify_horse_infos-stack'
import { ContextType } from './context_type'

// S3Keyのハッシュ値を正規化するためのヘルパー関数
function normalizeS3Keys (template: any): any {
  const normalized = structuredClone(template)

  // S3Keyの値を正規化
  function normalizeObject (obj: any): any {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map(normalizeObject)
      }
      const normalizedObj: any = {}
      Object.entries(obj).forEach(([key, value]) => {
        if (key === 'S3Key' && typeof value === 'string') {
          // S3Keyのハッシュ部分を固定値に置換
          normalizedObj[key] = value.replaceAll(/[a-f0-9]{64}/g, 'HASH_PLACEHOLDER')
        } else {
          normalizedObj[key] = normalizeObject(value)
        }
      })
      return normalizedObj
    }
    return obj
  }

  return normalizeObject(normalized)
}

describe('NotifyHorseInfosStack Snapshot Tests', () => {
  let app: App
  let stack: NotifyHorseInfosStack
  let context: ContextType

  beforeEach(() => {
    app = new App({
      context: {
        // CDKのアセットハッシュを固定化してテスト環境での一貫性を確保
        '@aws-cdk/aws-lambda-nodejs:useLatestRuntimeVersion': false,
      },
    })
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
    }
    stack = new NotifyHorseInfosStack(app, 'TestStack', {
      context,
    })
  })

  test('should match snapshot for complete stack', () => {
    const template = Template.fromStack(stack)
    const normalizedTemplate = normalizeS3Keys(template.toJSON())
    expect(normalizedTemplate).toMatchSnapshot()
  })

  test('should match snapshot for Lambda function configuration', () => {
    const template = Template.fromStack(stack)
    const lambdaFunctions = template.findResources('AWS::Lambda::Function')
    const normalizedLambdaFunctions = normalizeS3Keys(lambdaFunctions)
    expect(normalizedLambdaFunctions).toMatchSnapshot()
  })

  test('should match snapshot for Step Functions state machine', () => {
    const template = Template.fromStack(stack)
    const stateMachines = template.findResources('AWS::StepFunctions::StateMachine')
    const normalizedStateMachines = normalizeS3Keys(stateMachines)
    expect(normalizedStateMachines).toMatchSnapshot()
  })

  test('should match snapshot for EventBridge rule', () => {
    const template = Template.fromStack(stack)
    const eventRules = template.findResources('AWS::Events::Rule')
    const normalizedEventRules = normalizeS3Keys(eventRules)
    expect(normalizedEventRules).toMatchSnapshot()
  })

  test('should match snapshot for CloudWatch Log Group', () => {
    const template = Template.fromStack(stack)
    const logGroups = template.findResources('AWS::Logs::LogGroup')
    const normalizedLogGroups = normalizeS3Keys(logGroups)
    expect(normalizedLogGroups).toMatchSnapshot()
  })

  test('should match snapshot for IAM roles and policies', () => {
    const template = Template.fromStack(stack)
    const iamRoles = template.findResources('AWS::IAM::Role')
    const iamPolicies = template.findResources('AWS::IAM::Policy')
    const normalizedIamResources = normalizeS3Keys({ roles: iamRoles, policies: iamPolicies })
    expect(normalizedIamResources).toMatchSnapshot()
  })
})
