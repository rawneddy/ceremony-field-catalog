# Ceremony Field Catalog API (Spring Boot + MongoDB) — Local Setup Guide (Windows 11 + VS Code)

---

## 1  Install Prerequisites
> 💡 **Note:** This section ensures you have the necessary tools to build and run Java + Spring Boot applications. It's the Java equivalent of setting up your .NET SDK, Docker Desktop, and Visual Studio Code extensions.

| Tool | Version (2025‑04) | Install Steps |
|------|------------------|---------------|
| **Java SDK** | 17 LTS | Download MSI from <https://adoptium.net> → install → ensure `java -version` prints 17 |
| **Maven** | 3.9 | <https://maven.apache.org/download.cgi> → unzip → add `bin` to `PATH` (restart terminal after editing `PATH`) |
| **Docker Desktop** | Latest | <https://www.docker.com/products/docker-desktop/> → Install & Start. Make sure Docker is running (whale icon in system tray). On Windows, WSL2 is required. See [Docker's Windows install guide](https://docs.docker.com/desktop/install/windows-install/). |
| **Visual Studio Code** | Latest | <https://code.visualstudio.com> |
| **VS Code Extensions** | *Java Extension Pack*, *Spring Boot Extension Pack*, *Lombok Support*, *Test Explorer UI*, *REST Client (Huachao Mao)*, *Docker* | Ctrl + Shift + X → search & install |

---

## 2  Create Project
> 💡 **Note:** This step creates your project directory and bootstraps a basic Spring Boot application, similar to starting a new ASP.NET Web API project. (from VS Code terminal)

### Setup Repo Location
```powershell
mkdir C:\Projects\ceremony-catalog
cd    C:\Projects\ceremony-catalog

# If repo already exists
# git clone https://your-repo-url.git .
```

### Generate a Spring Boot skeleton (if starting fresh):

```powershell
mvn archetype:generate ^
  -DgroupId=com.ceremony.catalog ^
  -DartifactId=catalog-api ^
  -DarchetypeArtifactId=maven-archetype-quickstart ^
  -DinteractiveMode=false
```

### Create source files
These should be created inside the root of your project folder at the relative locations shown:

>These files implement the field catalog logic for tracking observed XML fields per path type (`deposits`, `loans`, `ondemand`). They include all necessary domain models, DTOs, repository interfaces, and service logic. .NET developers can think of these as the Java equivalents of models, view models, repositories, and services in an ASP.NET solution.

#### 📄 `.gitignore`
> Ensures build artifacts, IDE files, and other non-source files are not committed to source control. Equivalent to `.gitignore` in a .NET or Node.js project.

- View [.gitignore](.gitignore)

#### 📁 `src/main/java/com/ceremony/catalog/domain/FieldKey.java`
> Represents the unique identity of an observed field. This is similar to a composite key class in Entity Framework used for uniquely identifying a record.

- View [src/main/java/com/ceremony/catalog/domain/FieldKey.java](src/main/java/com/ceremony/catalog/domain/FieldKey.java)

#### 📁 `src/main/java/com/ceremony/catalog/domain/ContextKey.java`
> Serves as the context identifier for a group of field observations, depending on the business path (`deposits`, `loans`, or `ondemand`). .NET devs can think of it like a composite filter key used to partition or group entities.

- View [src/main/java/com/ceremony/catalog/domain/ContextKey.java](src/main/java/com/ceremony/catalog/domain/ContextKey.java)

#### 📁 `src/main/java/com/ceremony/catalog/domain/CatalogEntry.java`
> The main MongoDB document representing a field observation. Analogous to a POCO entity class in Entity Framework Core. Annotated with `@Document`, it defines how the Java class maps to a MongoDB collection.

> 💡 **Note:** Uses [Lombok](https://projectlombok.org/) to reduce boilerplate (getters, setters, constructors). Similar to how C# source generators reduce repetition. Ensure you have the Lombok VS Code extension installed.

- View [src/main/java/com/ceremony/catalog/domain/CatalogEntry.java](src/main/java/com/ceremony/catalog/domain/CatalogEntry.java)

#### 📁 `src/main/java/com/ceremony/catalog/api/dto/CatalogObservationDTO.java`
> A DTO (Data Transfer Object) for incoming JSON payloads from the REST API. Equivalent to a model class used with `[FromBody]` in ASP.NET Web API.

- View [src/main/java/com/ceremony/catalog/api/dto/CatalogObservationDTO.java](src/main/java/com/ceremony/catalog/api/dto/CatalogObservationDTO.java)

#### 📁 `src/main/java/com/ceremony/catalog/api/dto/CatalogSearchCriteria.java`
> Represents filter inputs for searching the catalog — like a search model used to bind GET query parameters in ASP.NET Web API.

- View [src/main/java/com/ceremony/catalog/api/dto/CatalogSearchCriteria.java](src/main/java/com/ceremony/catalog/api/dto/CatalogSearchCriteria.java)

#### 📁 `src/main/java/com/ceremony/catalog/persistence/CatalogRepository.java`
> Extends `MongoRepository`, giving you built-in methods like `save`, `findById`, and `findAll`. Think of it as your base repository interface — no need to manually implement basic CRUD logic.

- View [src/main/java/com/ceremony/catalog/persistence/CatalogRepository.java](src/main/java/com/ceremony/catalog/persistence/CatalogRepository.java)

#### 📁 `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepository.java`
> Declares the interface for dynamic search logic that doesn’t fit the standard `MongoRepository` naming pattern. Similar to defining a custom repository interface in a C# project.

- View [src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepository.java](src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepository.java)

#### 📁 `src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java`
> The implementation of your custom dynamic query logic using Spring's `MongoTemplate` and Criteria API. This would be like implementing a repository method using `IQueryable` or `Expression<Func<...>>` in .NET with full control over filtering.

- View [src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java](src/main/java/com/ceremony/catalog/persistence/CatalogCustomRepositoryImpl.java)

#### 📁 `src/main/java/com/ceremony/catalog/service/CatalogService.java`
> Encapsulates domain logic related to merging and querying field observations. Similar to a domain service or application service class in .NET.

> 💡 **Note:** Uses Spring Data pagination via `Pageable` and `PageRequest`, analogous to `Skip` + `Take` with `IQueryable`.

- View [src/main/java/com/ceremony/catalog/service/CatalogService.java](src/main/java/com/ceremony/catalog/service/CatalogService.java)

Add the following dependencies to your **`pom.xml`**: **`pom.xml`**:

> 💡 **Note:** In Java, `pom.xml` is the equivalent of your `.csproj` file in .NET. It defines your dependencies and how your project is built. Adding these before opening in VS Code ensures all necessary libraries are available for code completion, builds, and tests.

```xml
<dependencies>
  <!-- Spring Boot MongoDB support -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
  </dependency>

  <!-- Lombok for boilerplate code reduction -->
  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <scope>provided</scope>
  </dependency>

  <!-- Testcontainers for integration tests -->
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <version>1.19.1</version>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>mongodb</artifactId>
    <version>1.19.1</version>
    <scope>test</scope>
  </dependency>

  <!-- Spring Boot test framework -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>

<build>
  <plugins>
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>
    </plugin>
  </plugins>
</build>
```

---

## 3  Open and Build in VS Code
> 💡 **Note:** This step ensures VS Code is ready for Java development and verifies the project builds, just like `dotnet build` in a .NET world.

If you haven’t already:
1. Open the root project folder in VS Code: `File ▶ Open Folder…`
2. Accept prompts to install Java-related extensions.
3. Open a terminal (if not already open): `Terminal ▶ New Terminal`
4. Run:

```powershell
mvn compile
```

> 💡 **Note:** If you change dependencies in `pom.xml`, accept the "A build file was modified. Do you want to synchronize the Java classpath/configuration?" prompt in VS Code.

This will download dependencies and compile the code.

---

## 4  Add a Testcontainers-Based Integration Test
> 💡 **Note:** Instead of relying on a real or mocked MongoDB, this step sets up tests using Testcontainers — similar in spirit to running integration tests using a SQL Server Docker image in .NET.

### Add Testcontainers Dependency
Add the Testcontainers dependencies to your `pom.xml` if not already present:

```xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers</artifactId>
  <version>1.19.1</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>mongodb</artifactId>
  <version>1.19.1</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>1.19.1</version>
  <scope>test</scope>
</dependency>
```

### Add Unit Tests

#### 📁 `src/test/java/com/ceremony/catalog/service/CatalogServiceTest.java`

```java
@SpringBootTest
@Testcontainers
class CatalogServiceTest {

  @Container
  static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

  @DynamicPropertySource
  static void mongoProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
  }

  @Autowired
  CatalogService service;

  @Test
  void minOccursDropsToZeroWhenFieldMissing() {
    service.merge(List.of(
      new CatalogObservationDTO("Fulfillment", "DDA", "4S",
          "/Ceremony/FeeCode", "data", 1, false, false)
    ));

    service.merge(List.of(
      new CatalogObservationDTO("Fulfillment", "DDA", "4S",
          "/Ceremony/Other", "data", 1, false, false)
    ));

    var fee = service.find("Fulfillment", "DDA", "4S", PageRequest.of(0, 10))
                     .getContent().stream()
                     .filter(c -> c.getXpath().endsWith("FeeCode"))
                     .findFirst().orElseThrow();

    assertThat(fee.getMinOccurs()).isZero();
  }
}
```

### Run Integration Tests from the Terminal
1. Make sure Docker Desktop is running (whale icon in your system tray).
2. Open a terminal in your project root (PowerShell, Command Prompt, or WSL).
3. Run:
   ```powershell
   mvn clean test
   ```
   This will:
   - Start a temporary MongoDB container using Docker
   - Run your integration tests
   - Clean up the container automatically

> ⚠️ **Note:** You may see a warning like `MongoSocketReadException: Prematurely reached end of stream` in the logs. This is normal when using Testcontainers and just means the test container is shutting down. As long as your tests pass, you can ignore this message.

### See and Run Tests Visually in VS Code
.NET developers are used to the Test Explorer in Visual Studio. You can get a similar experience in VS Code:

1. **Install the following VS Code extensions:**
   - **Test Explorer UI** (search for `Test Explorer UI`)
   - **Java Test Runner** (often included in the Java Extension Pack)

2. **Open the Testing Sidebar:**
   - Click the beaker/flask icon on the left sidebar (or press `Ctrl+Shift+T`)
   - You will see a tree view of all your test classes and methods
   - You can run, debug, or view results for each test directly from this panel

> 💡 **Tip:** This gives you a Visual Studio-like experience for running and managing your Java tests in VS Code!

---

## 5  Configure MongoDB
> 💡 **Note:** This config file tells Spring Boot how to connect to MongoDB during local (non-test) runs — similar to setting `ConnectionStrings` in `appsettings.json` in ASP.NET.

### Create Configuration 
#### 📁 `src/main/resources/application.yml`:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/ceremony_catalog
```

This configuration is used when running the application outside Testcontainers (e.g. manually or in Docker).

---

## 6  Run & Smoke Test Locally (Optional During Development)
> 💡 **Note:** If you're actively coding and want to verify behavior, this lets you run and debug your app like you would with IIS Express or `dotnet run` + Postman.

If you'd like to run the app without containers during development:

### Start MongoDB with Docker

If you do not already have MongoDB running locally, you can start it easily with Docker:

```sh
docker run --name ceremony-mongo -p 27017:27017 -d mongo:7
```
- This will start a MongoDB container and expose it on `localhost:27017` as required by your Spring Boot app.
- You only need to do this once; the container will keep running until you stop it.
- If you restart your computer or Docker, you may need to start the container again with:
  ```sh
  docker start ceremony-mongo
  ```

### Start the API

```sh
mvn spring-boot:run
```

Server starts on **`http://localhost:8080`**.

> **Note:** Later in this tutorial, you will learn how to use Docker Compose to start both MongoDB and the API together for a more production-like setup. The instructions above are for local development convenience and will not interfere with Docker Compose usage later. If you use Docker Compose, you do not need to run the standalone `docker run` command for MongoDB at the same time—just use one approach at a time.

### Smoke Test with REST Client (.http)

> 🧪 **To use .http files for API testing in VS Code, install the REST Client extension (by Huachao Mao):**
> - Open the Extensions sidebar (Cmd+Shift+X)
> - Search for **REST Client**
> - Click Install

Create a new file named `CatalogSmokeTests.http` in the root of your project directory (same level as `pom.xml`).

This file can be used with the **REST Client** VS Code extension to test your API endpoints. Just click "Send Request" above each block to issue the request.

#### 📄 `CatalogSmokeTests.http`

```http
### Deposits Path
POST http://localhost:8080/catalog/observed-fields
Content-Type: application/json

[{
  "pathType": "deposits",
  "action": "Fulfillment",
  "productCode": "DDA",
  "productSubCode": "4S",
  "xpath": "/Ceremony/Accounts/Account/FeeCode",
  "dataType": "data",
  "count": 1,
  "hasNull": false,
  "hasEmpty": false
}]

### Loans Path
POST http://localhost:8080/catalog/observed-fields
Content-Type: application/json

[{
  "pathType": "loans",
  "loanProductCode": "HEQF",
  "xpath": "/BMIC/Application/FICO",
  "dataType": "data",
  "count": 1,
  "hasNull": false,
  "hasEmpty": false
}]

### OnDemand Path
POST http://localhost:8080/catalog/observed-fields
Content-Type: application/json

[{
  "pathType": "ondemand",
  "formCode": "ACK123",
  "formVersion": "v1.0",
  "xpath": "/eDocument/PrimaryCustomer/Name/First",
  "dataType": "data",
  "count": 1,
  "hasNull": false,
  "hasEmpty": false
}]
```

### (Optional) Wipe Out All Ceremony Data in MongoDB

If you want to completely remove all ceremony data from your MongoDB (for a clean slate during development/testing), you can do this with Docker:

1. Make sure your MongoDB container is running (`docker ps` should show `ceremony-mongo`).
2. Open a terminal (PowerShell, Command Prompt, or WSL) and run:
   ```sh
   docker exec -it ceremony-mongo mongosh
   ```
3. At the `>` prompt, switch to the ceremony catalog database:
   ```js
   use ceremony_catalog
   ```
4. Drop all collections (this will delete all data):
   ```js
   db.dropDatabase()
   ```
5. Type `exit` to leave the shell.

> ⚠️ **Warning:** This will permanently delete all data in the `ceremony_catalog` database. Only do this if you are sure you want to wipe out all catalog data.

### Debugging

You can debug your Spring Boot API in VS Code just like you would with .NET in Visual Studio:

1. **Set a Breakpoint:**
   - Open the Java file you want to debug (e.g., `src/main/java/com/ceremony/catalog/api/CatalogController.java`).
   - Click in the gutter next to the line number where you want to set a breakpoint (for example, inside a controller method).

2. **Start the API in Debug Mode:**
   - Open the Run & Debug sidebar (play icon with a bug, or press `Cmd+Shift+D`).
   - Click "Run and Debug" and select "Java" or "Spring Boot" if prompted.
   - Alternatively, run:
     ```sh
     mvn spring-boot:run -Dspring-boot.run.fork=false
     ```
   - Or use the green "Run" or "Debug" buttons that appear above your `main` method in VS Code.

3. **Send a Request:**
   - Use the REST Client extension to send a request from your `.http` file (e.g., `CatalogSmokeTests.http`).
   - When the request hits your breakpoint, VS Code will pause execution and let you inspect variables, step through code, etc.

4. **Debug as Usual:**
   - Use the debug controls in VS Code to step over, step into, or continue execution.
   - Inspect variables and call stack in the debug sidebar.

> 💡 **Tip:** This workflow is very similar to debugging ASP.NET controllers in Visual Studio, making it easy for .NET developers to transition to Java/Spring Boot debugging in VS Code.

---

## 7  Run the Full Stack via Docker Compose
> 💡 **Note:** This builds and runs your app and MongoDB using Docker Compose — much like dockerizing an ASP.NET app alongside SQL Server and running both together.

1. Build the app:

```bash
mvn clean package
```

2. Create a `Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jdk
WORKDIR /app
COPY target/catalog-api*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

3. Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    container_name: ceremony-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  catalog-api:
    build: .
    depends_on:
      - mongo
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/ceremony_catalog

volumes:
  mongo_data:
```

4. Run everything together:

```bash
docker-compose up --build
```

5. You should now be able to run the smoketest again from earlier
   
---

## 8  Next Steps
> 💡 **Note:** These are optional enhancements and patterns that will help you scale, test, and document your API over time, similar to adding Swagger, test automation, and CI pipelines in .NET.

* Add **Swagger UI** (`springdoc-openapi-starter-webmvc-ui`) → browse `/swagger-ui.html`
* Use profiles (`application-dev.yml`) for easier local vs. containerized configuration
* Consider CI integration to auto-run Testcontainers-based tests

> You now have a fully working Spring Boot + MongoDB Catalog API running on Windows 11 with VS Code — complete with testing, smoke testing, and full Docker Compose orchestration.

