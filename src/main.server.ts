import '@angular/platform-server/init';
import 'zone.js/node';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appServerConfig } from './app/app.config.server';

const bootstrap = () => bootstrapApplication(App, appServerConfig);

export default bootstrap;
