import chalk from "chalk";
import Table from "cli-table3";
import ora from "ora";

export async function spinnerWithCallback<T>(
  name: string,
  fn: () => Promise<T> | T,
  successMessage: (d: T) => string = () => `${name} OK`
) {
  return spinner(name, fn(), successMessage);
}

export async function spinner<T>(
  name: string,
  value: Promise<T> | T,
  successMessage: (d: T) => string = () => `${name} OK`
): Promise<T> {
  const spinner = ora(name).start();

  let prom: Promise<T>;
  if (value instanceof Promise) {
    prom = value;
  } else {
    prom = Promise.resolve(value);
  }

  const startTime = performance.now();
  return prom
    .then((d) => {
      const elapsedTime = performance.now() - startTime;
      spinner.succeed(
        `${successMessage(d).padEnd(32, " ")} ${chalk.gray(`(${elapsedTime.toPrecision(4)}ms)`)}`
      );
      return d;
    })
    .catch((e) => {
      spinner.fail(`${name}, ${e.toString()}`);
      throw `Failed to load: ${name}`;
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function printTable(header: any[], ...rows: any[][]): void {
  const table = new Table({ head: header, wordWrap: true });
  table.push(...rows);
  console.log(table.toString());
  return;
}
