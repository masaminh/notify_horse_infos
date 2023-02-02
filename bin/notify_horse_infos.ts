#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NotifyHorseInfosStack } from '../lib/notify_horse_infos-stack';
import { isContextType } from '../lib/context_type';

const app = new cdk.App();

const context = app.node.tryGetContext('context');

if (!isContextType(context)) {
  throw new Error('bad context');
}

// eslint-disable-next-line no-new
new NotifyHorseInfosStack(app, context.stackName, { context });
