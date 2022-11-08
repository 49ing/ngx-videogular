## ngx-videogular/core

Main module, it creates the `VgApiService` and contains some required components and directives like `VgPlayer` and `VgMedia`.

Import definition:

```typescript
...
import { VgCoreModule } from '@49ing/ngx-videogular/core';

@NgModule({
    ...
    imports: [
        ...
        VgCoreModule
    ],
    ...
})
export class AppModule {
}
```
