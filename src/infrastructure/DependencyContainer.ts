export class DependencyContainer<T extends { [x: PropertyKey]: unknown }> {
  constructor(private _dependencies: T) {}

  add<Key extends PropertyKey, Dependency>(
    key: Key,
    getDependency: (dependencies: T) => Dependency,
    isLazy: boolean = true
  ): DependencyContainer<T & { [K in Key]: Dependency }> {
    const deps = this._dependencies;
    let dependencyInstance: Dependency | null = null;
    const currentDependency = isLazy
      ? {
          get [key]() {
            if (dependencyInstance === null)
              dependencyInstance = getDependency(deps);
            return dependencyInstance;
          },
        }
      : { [key]: getDependency(deps) };

    const nextDeps = { ...this._dependencies, ...currentDependency };

    return new DependencyContainer<T & { [K in Key]: Dependency }>(nextDeps);
  }
  get dependencies() {
    return this._dependencies;
  }
}
