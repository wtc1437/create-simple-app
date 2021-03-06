import inquirer from 'inquirer';
import { EventEmitter } from 'events';
import WebpackConfig from 'webpack-chain';
import fs from 'fs-extra';
import path from 'path';
import {
  IPlugin, IPrompt, IPromptCallBack, IPackage, IGeneratorOtions, IModulePrompt,
} from '../types';
import GeneratorAPI from './generatorAPI';
import codeFormat from '../utils/codeFormat';

export default class Generator extends EventEmitter {
  private plugins: IPlugin[];

  presetPrompts: IPrompt[];

  promptCallBacks: IPromptCallBack[];

  modulePrompts: IModulePrompt[];

  config: WebpackConfig

  pkg: IPackage;

  context: string;

  constructor(context: string, options: IGeneratorOtions) {
    super();
    this.context = context;
    const { plugins, pkg } = options;
    this.plugins = plugins;
    this.pkg = pkg;
    this.config = new WebpackConfig();
    this.presetPrompts = [];
    this.promptCallBacks = [];
    this.modulePrompts = [];
    this.installPlugins();
  }

  /**
   * 加载插件
   */
  installPlugins() {
    this.plugins.forEach((plugin) => {
      const { id, apply } = plugin;
      const api = new GeneratorAPI(id, this);
      apply(api);
    });
  }

  /**
   * 添加预设选项
   */
  addPresetPrompt(prompt: IPrompt) {
    this.presetPrompts.push(prompt);
  }

  /**
   * 添加预设回调
   */
  addPresetPromptCallBack(cd: IPromptCallBack) {
    this.promptCallBacks.push(cd);
  }

  /**
   * 添加模块选项
   */
  addModulePrompt(prompt: IModulePrompt) {
    this.modulePrompts.push(prompt);
  }

  /**
   * 判断插件
   */
  hasPlugin(id: string): boolean {
    return this.plugins.filter((item) => item.id === id).length > 0;
  }

  /**
   * 创建
   */
  async create() {
    this.presetPrompts.unshift({
      name: 'module',
      type: 'checkbox',
      message: '请选择需要的功能:',
      choices: this.modulePrompts,
    });
    const result = await inquirer.prompt(this.presetPrompts); // 交互式选择配置
    // 预设回调
    this.promptCallBacks.forEach((cb) => {
      cb(result);
    });
    fs.writeFileSync(path.join(this.context, 'webpack.config.js'), codeFormat(`module.exports = ${this.config.toString()}`));
    fs.writeJSONSync(path.join(this.context, 'package.json'), this.pkg);
    this.emit('after-create');
  }
}
