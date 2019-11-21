import { CommandStep, DataType } from ".";
import { window } from "vscode";

/**
 * Input recieved from a series of command steps executed.
 */
type CommandStepsOutput = {
  required: { [key: string]: any };
  optional: { [key: string]: any };
};

/**
 * Filtered command steps from a collection of command steps.
 */
type FilteredCommandSteps = {
  requiredSteps: CommandStep[];
  optionalDefaultParams: { [key: string]: any };
};

export class CommandSteps {
  /**
   * Create a new collection of command steps.
   */
  constructor(public steps: CommandStep[]) {}

  /**
   * Execute the series of command steps.
   *
   * If optional steps are disabled, default values for the parameters
   * are used.
   *
   * @param disableOptionalSteps Should command steps that are optional be skipped
   */
  public async collectInputs(
    disableOptionalSteps = false
  ): Promise<CommandStepsOutput> {
    let steps = this.steps;
    let params: CommandStepsOutput = {
      required: {},
      optional: {}
    };

    // If disable is true, optional input prompt are hidden, and adonis
    // cli fallsback on in-built default values for optional params.
    if (disableOptionalSteps) {
      const filtered = CommandSteps._filterOptionalSteps(this.steps);
      steps = filtered.requiredSteps;
      params.optional = filtered.optionalDefaultParams;
    }

    for (const step of steps) {
      let input = await this._collectInputByStepType(step);
      if (input === undefined) throw Error("Input prompt exited abruptly.");
      if (step.optional) params.optional[step.param] = input;
      else params.required[step.param] = input;
    }

    return params;
  }

  /**
   * Filter out command steps, and return only required compulsory steps and the default
   * values for all optional steps.
   *
   * @param steps Command steps to filter.
   */
  private static _filterOptionalSteps(
    steps: CommandStep[]
  ): FilteredCommandSteps {
    let result: FilteredCommandSteps = {
      optionalDefaultParams: {},
      requiredSteps: []
    };

    return steps.reduce((previous, current) => {
      if (current.optional && current.default) {
        // If optional, when step is executed, it use the default provided,
        // else it will fallback to the default provided by Adonis CLI.
        result.optionalDefaultParams[current.param] = current.default;
      }

      if (!current.optional) {
        previous.requiredSteps.push(current);
      }

      return previous;
    }, result);
  }

  /**
   * Collect user input for a command step. Input type show to user, is
   * dependent on the type of the command step.
   *
   * @param step Command step to collect input for.
   */
  private async _collectInputByStepType(
    step: CommandStep
  ): Promise<string | boolean | undefined> {
    switch (step.type) {
      case DataType.String:
      case DataType.Integer:
        return this._collectInputForStringAndInteger(step);

      case DataType.Boolean:
        return this._collectInputForBoolean(step);

      default:
        return this._collectInputForEnum(step);
    }
  }

  /**
   * Collect user input for an command step expecting either a string or an
   * integer value.
   *
   * @param step Command step to collect input for.
   */
  private async _collectInputForStringAndInteger(
    step: CommandStep
  ): Promise<string | undefined> {
    return window.showInputBox({
      placeHolder: step.message,
      value: step.default === undefined ? "" : step.default.toString(),
      validateInput: step.validateInput
    });
  }

  /**
   * * Collect user input for an command step expecting a boolean value.
   *
   * @param step Command step to collect input for.
   */
  private async _collectInputForBoolean(
    step: CommandStep
  ): Promise<boolean | undefined> {
    const items = ["Yes", "No"];
    const options = { placeHolder: step.message };
    const value = await window.showQuickPick(items, options);
    if (value === undefined) return value;
    return value === "Yes";
  }

  /**
   * Collect user input for an command step expecting an enum value.
   *
   * @param step Command step to collect input for.
   */
  private async _collectInputForEnum(
    step: CommandStep
  ): Promise<string | undefined> {
    const items = Object.values(step.type);
    const options = { placeHolder: step.message };
    return window.showQuickPick(items, options);
  }
}
