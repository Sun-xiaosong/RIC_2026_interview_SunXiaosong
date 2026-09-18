import { Typography } from 'antd';
import { FEATURE_LABELS, FEATURE_ORDER } from '../lib/constants';
import type { FeatureKey, Vote } from '../types/course';

interface FeatureVotesProps {
  votes: Record<FeatureKey, Vote>;
}

/** 课程特征投票(是否有导修/论文/期末等):双段进度条 + 计数。 */
export function FeatureVotes({ votes }: FeatureVotesProps) {
  return (
    <div className="feature-votes">
      {FEATURE_ORDER.map((key) => {
        const vote = votes[key] ?? { yes: 0, no: 0 };
        const total = vote.yes + vote.no;
        return (
          <div className="feature-vote-row" key={key}>
            <span className="feature-vote-row__label">{FEATURE_LABELS[key]}</span>
            {total === 0 ? (
              <Typography.Text type="secondary">暂无投票</Typography.Text>
            ) : (
              <>
                <div className="vote-bar">
                  <div
                    className="vote-bar__yes"
                    style={{ width: `${(vote.yes / total) * 100}%` }}
                  />
                </div>
                <span className="feature-vote-row__counts">
                  有 {vote.yes} · 无 {vote.no}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
