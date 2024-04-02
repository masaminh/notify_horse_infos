import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { readFileSync } from 'node:fs';
import { NotifyHorseInfosStack } from './notify_horse_infos-stack';

describe('NotifyHorseInfosStack', () => {
  let template: Template;
  let context: any;

  beforeAll(() => {
    context = JSON.parse(readFileSync('cdk.context.json', 'utf-8'));
    const app = new cdk.App();
    const stack = new NotifyHorseInfosStack(app, 'NotifyHorseInfosStack', context);

    template = Template.fromStack(stack);
  });

  it('LogGroup', () => {
    template.hasResource('AWS::Logs::LogGroup', {
      Properties: {
        LogGroupName: `${context.context.stackName}/EntryFunction`,
        RetentionInDays: 30,
      },
      DeletionPolicy: 'Delete',
    });
  });
});
