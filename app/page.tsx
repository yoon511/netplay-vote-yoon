"use client";

import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

// 날짜 포맷
function formatKoreanDate(dateStr: string) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

export default function Home() {
  const [polls, setPolls] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  // 🔥 관리자 설정
  const ADMIN_PASS = "yoon511";
  const [adminMode, setAdminMode] = useState(false);
  const [adminInput, setAdminInput] = useState("");

  // 🔥 로그 데이터
  const [logs, setLogs] = useState<any[]>([]);
  const [openedPollId, setOpenedPollId] = useState("");

  // ▼ 모임 목록 로드
  useEffect(() => {
    const q = query(collection(db, "polls"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setPolls(arr);
    });
    return () => unsub();
  }, []);

  // ▼ 특정 모임 로그 로드
  useEffect(() => {
    if (!openedPollId) return;
    const ref = collection(db, "polls", openedPollId, "logs");
    const q = query(ref, orderBy("time", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push(d.data()));
      setLogs(arr);
    });
    return () => unsub();
  }, [openedPollId]);

  // ▼ 로그 기록
  async function addLog(type: string, pollId: string, userName: string) {
    await addDoc(collection(db, "polls", pollId, "logs"), {
      type,
      name: userName,
      time: Timestamp.now(),
    });
  }

  // ▼ 참가하기
  async function handleJoin(poll: any) {
    if (!name || !password) return alert("이름과 비밀번호를 입력하세요.");
    if (password.length !== 4) return alert("비밀번호는 숫자 4자리입니다.");

    const ref = doc(db, "polls", poll.id);

    const participants = poll.participants || [];
    const waitlist = poll.waitlist || [];
    const user = { name, pass: password };

    if (participants.find((p: any) => p.name === name))
      return alert("이미 참여 중입니다.");
    if (waitlist.find((w: any) => w.name === name))
      return alert("이미 대기 중입니다.");

    if (participants.length < poll.capacity) {
      await updateDoc(ref, { participants: [...participants, user] });
      await addLog("join", poll.id, name);
      return;
    }

    await updateDoc(ref, { waitlist: [...waitlist, user] });
    await addLog("join", poll.id, name);
  }

  // ▼ 취소 (확인 팝업)
  async function confirmCancel(poll: any) {
    if (!confirm("정말 취소하시겠습니까?")) return;
    handleCancel(poll);
  }

  // ▼ 취소 처리
  async function handleCancel(poll: any) {
    const ref = doc(db, "polls", poll.id);

    let participants = poll.participants || [];
    let waitlist = poll.waitlist || [];

    const inP = participants.find((p: any) => p.name === name && p.pass === password);
    const inW = waitlist.find((p: any) => p.name === name && p.pass === password);

    if (inP) {
      participants = participants.filter(
        (p: any) => !(p.name === name && p.pass === password)
      );

      // 자동 승급
      if (waitlist.length > 0) {
        const next = waitlist[0];
        waitlist = waitlist.slice(1);
        participants.push(next);
        await addLog("promote", poll.id, next.name);
      }

      await updateDoc(ref, { participants, waitlist });
      await addLog("cancel", poll.id, name);
      return;
    }

    if (inW) {
      waitlist = waitlist.filter(
        (p: any) => !(p.name === name && p.pass === password)
      );
      await updateDoc(ref, { waitlist });
      await addLog("cancel", poll.id, name);
      return;
    }

    alert("참석 정보가 없습니다.");
  }

  // ▼ 관리자 강제 삭제 기능
  async function forceRemoveUser(poll: any, target: any, type: "participant" | "waitlist") {
    if (!adminMode) return alert("관리자만 가능합니다.");

    const ref = doc(db, "polls", poll.id);
    let participants = poll.participants || [];
    let waitlist = poll.waitlist || [];

    if (type === "participant") {
      participants = participants.filter((p: any) => p !== target);
    } else {
      waitlist = waitlist.filter((p: any) => p !== target);
    }

    await updateDoc(ref, { participants, waitlist });
    await addLog("admin_remove", poll.id, target.name);
  }

  // ▼ 관리자 로그인
  function loginAdmin() {
    if (adminInput === ADMIN_PASS) {
      setAdminMode(true);
      setAdminInput("");
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  }

  return (
    <main className="flex justify-center items-start min-h-screen bg-[#fdfbf6] p-6">
      <div className="w-full max-w-sm font-sans">

        {/* 로고 */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl font-bold text-red-400">Netplay 참석 투표 - 윤</span>
          <span className="text-xl">🏸</span>
        </div>

        {/* 사용자 정보 입력 */}
        <div className="bg-white p-4 rounded-2xl shadow mb-6">
          <div className="font-semibold mb-1 text-sm">사용자 정보 입력</div>

          <input
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded-xl mb-2"
          />

          <input
            placeholder="비밀번호 4자리"
            maxLength={4}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-xl"
          />
        </div>

        {/* 모임 리스트 */}
        {polls.map((poll) => (
          <div key={poll.id} className="bg-white rounded-2xl shadow mb-6 p-4">

            <div className="text-lg font-semibold mb-1">{poll.title}</div>
            <div className="text-sm mb-1">📅 {formatKoreanDate(poll.date)}</div>
            <div className="text-sm mb-1">
              🕒 {poll.time} · 💰 {poll.fee}
            </div>
            <div className="text-sm text-gray-700">{poll.location}</div>
            <div className="text-xs text-gray-600 mt-1 mb-3">
              정원 {poll.capacity}명 중 {poll.participants?.length || 0}명 참여
            </div>

            {/* 참여/취소 버튼 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleJoin(poll)}
                className="flex-1 bg-red-300 hover:bg-red-400 text-white py-2 rounded-full"
              >
                참가하기
              </button>

              <button
                onClick={() => confirmCancel(poll)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-full"
              >
                취소하기
              </button>
            </div>

            {/* 참여자 목록 */}
            <Expandable title={`참여자 (${poll.participants?.length || 0})`}>
              {(poll.participants || []).map((p: any, idx: number) => (
                <li key={idx} className="flex justify-between">
                  {p.name}

                  {adminMode && (
                    <button
                      onClick={() => forceRemoveUser(poll, p, "participant")}
                      className="text-xs text-red-500"
                    >
                      강제삭제
                    </button>
                  )}
                </li>
              ))}
            </Expandable>

            {/* 대기자 */}
            <Expandable title={`대기자 (${poll.waitlist?.length || 0})`}>
              {(poll.waitlist || []).map((w: any, idx: number) => (
                <li key={idx} className="flex justify-between">
                  대기 {idx + 1}. {w.name}

                  {adminMode && (
                    <button
                      onClick={() => forceRemoveUser(poll, w, "waitlist")}
                      className="text-xs text-red-500"
                    >
                      강제삭제
                    </button>
                  )}
                </li>
              ))}
            </Expandable>

            {/* 로그 보기 (관리자만) */}
            {adminMode && (
              <button
                onClick={() => setOpenedPollId(openedPollId === poll.id ? "" : poll.id)}
                className="text-xs text-blue-600 underline mt-2"
              >
                로그 보기
              </button>
            )}

            {/* 로그 리스트 */}
            {adminMode && openedPollId === poll.id && (
              <div className="mt-3 bg-gray-50 p-3 rounded-xl text-xs">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.type === "cancel"
                        ? "text-red-500"
                        : log.type === "promote"
                        ? "text-blue-500"
                        : "text-black"
                    }
                  >
                    ● [{log.type}] {log.name} —{" "}
                    {log.time.toDate().toLocaleString("ko-KR")}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 관리자 로그인 */}
        <div className="bg-white p-4 rounded-2xl shadow">
          {!adminMode ? (
            <>
              <input
                placeholder="관리자 비밀번호"
                type="password"
                className="w-full p-2 border rounded-xl mb-2"
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
              />

              <button
                onClick={loginAdmin}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded-xl"
              >
                관리자 모드 열기
              </button>
            </>
          ) : (
            <div className="text-sm text-gray-700">관리자 모드 활성화됨 ✔</div>
          )}
        </div>
      </div>
    </main>
  );
}

// 접힘 UI
function Expandable({ title, children }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center text-sm font-semibold mb-1"
      >
        {title}
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <ul className="text-sm pl-5 list-disc bg-gray-50 p-3 rounded-xl shadow-inner">
          {children}
        </ul>
      )}
    </div>
  );
}
