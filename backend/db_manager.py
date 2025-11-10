import threading
import sqlite3
import os


class SingletonMeta(type):
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        with cls._lock:
            if cls not in cls._instances:
                instance = super().__call__(*args, **kwargs)
                cls._instances[cls] = instance
            return cls._instances[cls]


class DatabaseManager(metaclass=SingletonMeta):
    def __init__(self, db_name="data/database.db"):
        if not hasattr(self, 'connection'):
            self.db_name = db_name
            self._connection = None
            self.cursor = None
            self._lock = threading.Lock()  # Блокировка для потокобезопасности
            self._connect()

    def _connect(self):
        flag = False
        if not os.path.exists(self.db_name):
            flag = True

        if self._connection is None:
            self._connection = sqlite3.connect(self.db_name, check_same_thread=False)
            self.cursor = self._connection.cursor()

        if flag:
            self.create_tables()
        else:
            # Миграция: добавляем колонку solution, если её нет
            self._migrate_add_solution_column()

    def _migrate_add_solution_column(self):
        """Миграция: добавляет колонку solution в таблицу tasks, если её нет"""
        try:
            # Проверяем, существует ли колонка solution
            self.cursor.execute("PRAGMA table_info(tasks)")
            columns = [column[1] for column in self.cursor.fetchall()]

            if 'solution' not in columns:
                print("Adding 'solution' column to tasks table...")
                self.cursor.execute("ALTER TABLE tasks ADD COLUMN solution TEXT DEFAULT NULL")
                self._connection.commit()
                print("Migration completed: 'solution' column added")
        except Exception as e:
            print(f"Migration error: {e}")

    def create_tables(self):
        self.cursor.execute("""
            CREATE TABLE tasks (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT,
                statement  TEXT    NOT NULL,
                solution   TEXT    DEFAULT NULL,
                category   TEXT,
                difficulty TEXT
            );
        """)
        self.cursor.execute("""
            CREATE TABLE submission (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                statement TEXT,
                solution  TEXT,
                status    TEXT,
                score     REAL,
                hints     TEXT
            );
        """)
        self._connection.commit()

    def create_submission(self, statement):
        """Создать новую submission (потокобезопасно)"""
        with self._lock:
            cursor = self._connection.cursor()
            try:
                cursor.execute("""INSERT INTO submission (statement, status) VALUES (?, ?)""",
                                (statement, 'Parsing'))
                self._connection.commit()
                return cursor.execute("""SELECT last_insert_rowid();""").fetchone()
            finally:
                cursor.close()

    def update_submission(self, id_submission, solution, status, hints, score):
        """Обновить submission (потокобезопасно)"""
        with self._lock:
            cursor = self._connection.cursor()
            try:
                cursor.execute("""UPDATE submission SET solution = ?, status = ?, hints = ?, score = ? WHERE id = ?""",
                                (solution, status, hints, score, id_submission))
                self._connection.commit()
            finally:
                cursor.close()

    def get_submission(self, id_submission):
        """Получить submission по ID (потокобезопасно)"""
        with self._lock:
            # Создаем новый курсор для каждого запроса, чтобы избежать конфликтов
            cursor = self._connection.cursor()
            try:
                result = cursor.execute("""SELECT solution, status, score, hints FROM submission WHERE id = ?""",
                                (id_submission,)).fetchone()
                return result
            finally:
                cursor.close()

    def all_task(self, category):
        category = '%' + category + '%'
        return self.cursor.execute("""
            SELECT id, title, statement, category, difficulty
            FROM tasks WHERE category LIKE ?
        """, (category,)).fetchall()

    def get_all_id(self):
        return self.cursor.execute("""SELECT id FROM tasks""").fetchall()

    def get_unique_categories(self):
        return self.cursor.execute(
            """SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL AND category != '' ORDER BY category""").fetchall()

    def get_unique_difficulties(self):
        return self.cursor.execute(
            """SELECT DISTINCT difficulty FROM tasks WHERE difficulty IS NOT NULL AND difficulty != '' ORDER BY difficulty""").fetchall()

    def get_all_id_by_difficulty_and_by_category(self, difficulty, category):
        difficulty = '%' + difficulty + '%'
        category = '%' + category + '%'
        return self.cursor.execute(
            """SELECT id FROM tasks WHERE difficulty LIKE ? AND category LIKE ?""",
            (difficulty, category),
        ).fetchall()

    def get_task_by_id(self, id_task):
        return self.cursor.execute("""
                    SELECT id, title, statement, solution, category, difficulty
                    FROM tasks WHERE id = ?
                """, (id_task,)).fetchone()

    def get_task_solution(self, id_task):
        """Получить решение задачи по ID (потокобезопасно)"""
        with self._lock:
            cursor = self._connection.cursor()
            try:
                result = cursor.execute("""
                    SELECT solution FROM tasks WHERE id = ?
                """, (id_task,)).fetchone()
                return result[0] if result and result[0] else None
            finally:
                cursor.close()

    def update_task_solution(self, id_task, solution):
        """Обновить решение задачи в БД (потокобезопасно)"""
        with self._lock:
            cursor = self._connection.cursor()
            try:
                cursor.execute("""
                    UPDATE tasks SET solution = ? WHERE id = ?
                """, (solution, id_task))
                self._connection.commit()
            finally:
                cursor.close()

    def create_task(self, title, statement, category, difficulty):
        self.cursor.execute("""INSERT INTO tasks (title, statement, category, difficulty) VALUES (?, ?, ?, ?)""",
                            (title, statement, category, difficulty))
        self._connection.commit()

    def get_task_by_all(self, title, statement, category, difficulty):
        id_task = self.cursor.execute("""
            SELECT id
            FROM tasks
            WHERE title=? AND statement=? AND category=? AND difficulty=?
        """, (title, statement, category, difficulty)).fetchone()

        return id_task

    def get_task_by_statement(self, statement):
        """Найти задачу по statement и получить её решение (потокобезопасно)"""
        with self._lock:
            cursor = self._connection.cursor()
            try:
                result = cursor.execute("""
                    SELECT id, solution, category, difficulty
                    FROM tasks
                    WHERE statement = ?
                """, (statement,)).fetchone()
                return result
            finally:
                cursor.close()

    def save_task_solution(self, statement, solution, category=None, difficulty=None):
        """Сохранить или обновить решение задачи в БД (потокобезопасно)"""
        with self._lock:
            cursor = self._connection.cursor()
            try:
                # Проверяем, есть ли задача с таким statement
                existing = cursor.execute("""
                    SELECT id, difficulty FROM tasks WHERE statement = ?
                """, (statement,)).fetchone()
                
                if existing:
                    task_id = existing[0]
                    existing_difficulty = existing[1] if len(existing) > 1 else None
                    
                    # Обновляем решение существующей задачи
                    cursor.execute("""
                        UPDATE tasks SET solution = ? WHERE id = ?
                    """, (solution, task_id))
                    
                    # Обновляем сложность только если её нет и она передана
                    if difficulty and not existing_difficulty:
                        cursor.execute("""
                            UPDATE tasks SET difficulty = ? WHERE id = ?
                        """, (difficulty, task_id))
                    
                    self._connection.commit()
                    return task_id
                else:
                    # Создаем новую задачу с решением
                    cursor.execute("""
                        INSERT INTO tasks (statement, solution, category, difficulty)
                        VALUES (?, ?, ?, ?)
                    """, (statement, solution, category, difficulty))
                    self._connection.commit()
                    return cursor.execute("SELECT last_insert_rowid()").fetchone()[0]
            finally:
                cursor.close()

    def _drop_all(self):
        self.cursor.execute("""DROP TABLE tasks""")
        self._connection.commit()

    def disconnect(self):
        if self._connection is not None:
            self._connection.close()
            self._connection = None
