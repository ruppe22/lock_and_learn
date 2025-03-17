-- Schema for quiz functionality

-- Table to store quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  time_limit_seconds INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table to store quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  explanation TEXT,
  correct_answer_id UUID,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table to store question answers
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update the correct_answer_id in quiz_questions
ALTER TABLE quiz_questions 
ADD CONSTRAINT fk_correct_answer 
FOREIGN KEY (correct_answer_id) 
REFERENCES quiz_answers(id) 
ON DELETE SET NULL;

-- Table to store user quiz assignments
CREATE TABLE IF NOT EXISTS user_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  score INTEGER,
  total_questions INTEGER,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, quiz_id)
);

-- Table to store user answers to quiz questions
CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_answer_id UUID REFERENCES quiz_answers(id) ON DELETE SET NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON quiz_questions;
CREATE TRIGGER update_quiz_questions_updated_at
BEFORE UPDATE ON quiz_questions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
DROP POLICY IF EXISTS "Users can view quizzes" ON quizzes;
CREATE POLICY "Users can view quizzes"
  ON quizzes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert quizzes" ON quizzes;
CREATE POLICY "Authenticated users can insert quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own quizzes" ON quizzes;
CREATE POLICY "Users can update their own quizzes"
  ON quizzes FOR UPDATE
  USING (auth.uid() = created_by);

-- Quiz questions policies
DROP POLICY IF EXISTS "Users can view quiz questions" ON quiz_questions;
CREATE POLICY "Users can view quiz questions"
  ON quiz_questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert quiz questions" ON quiz_questions;
CREATE POLICY "Authenticated users can insert quiz questions"
  ON quiz_questions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own quiz questions" ON quiz_questions;
CREATE POLICY "Users can update their own quiz questions"
  ON quiz_questions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM quizzes
    WHERE quizzes.id = quiz_questions.quiz_id
    AND quizzes.created_by = auth.uid()
  ));

-- Quiz answers policies
DROP POLICY IF EXISTS "Users can view quiz answers" ON quiz_answers;
CREATE POLICY "Users can view quiz answers"
  ON quiz_answers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert quiz answers" ON quiz_answers;
CREATE POLICY "Authenticated users can insert quiz answers"
  ON quiz_answers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own quiz answers" ON quiz_answers;
CREATE POLICY "Users can update their own quiz answers"
  ON quiz_answers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM quiz_questions
    JOIN quizzes ON quizzes.id = quiz_questions.quiz_id
    WHERE quiz_questions.id = quiz_answers.question_id
    AND quizzes.created_by = auth.uid()
  ));

-- User quizzes policies
DROP POLICY IF EXISTS "Users can view their own quiz assignments" ON user_quizzes;
CREATE POLICY "Users can view their own quiz assignments"
  ON user_quizzes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can insert user quizzes" ON user_quizzes;
CREATE POLICY "Authenticated users can insert user quizzes"
  ON user_quizzes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own quiz assignments" ON user_quizzes;
CREATE POLICY "Users can update their own quiz assignments"
  ON user_quizzes FOR UPDATE
  USING (auth.uid() = user_id);

-- User answers policies
DROP POLICY IF EXISTS "Users can view their own answers" ON user_answers;
CREATE POLICY "Users can view their own answers"
  ON user_answers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own answers" ON user_answers;
CREATE POLICY "Users can insert their own answers"
  ON user_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Profiles policies
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create a function to get quiz with questions and answers
CREATE OR REPLACE FUNCTION get_quiz_with_questions(quiz_id UUID)
RETURNS JSONB AS $$
DECLARE
  quiz_data JSONB;
BEGIN
  -- Get the quiz
  SELECT jsonb_build_object(
    'id', q.id,
    'title', q.title,
    'description', q.description,
    'time_limit_seconds', q.time_limit_seconds,
    'created_at', q.created_at,
    'questions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', qq.id,
          'question_text', qq.question_text,
          'explanation', qq.explanation,
          'correct_answer_id', qq.correct_answer_id,
          'answers', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', qa.id,
                'answer_text', qa.answer_text,
                'is_correct', qa.is_correct
              )
            )
            FROM quiz_answers qa
            WHERE qa.question_id = qq.id
          )
        )
      )
      FROM quiz_questions qq
      WHERE qq.quiz_id = q.id
      ORDER BY qq.order_index
    )
  )
  INTO quiz_data
  FROM quizzes q
  WHERE q.id = quiz_id;
  
  RETURN quiz_data;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to create a profile when a user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

