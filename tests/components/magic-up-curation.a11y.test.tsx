/**
 * MagicUpCurationStatus — radiogroup acessível (WAI-ARIA APG Radio Group)
 *
 * E-23: o seletor de estado de curadoria anunciava role="radiogroup" com
 * tabIndex=0 no container e TODOS os radios tabbáveis — o usuário de teclado
 * tinha que passar por 8 paradas de Tab e não havia navegação por setas.
 *
 * Este arquivo prova o padrão APG completo:
 *   - nome acessível no radiogroup (aria-labelledby → "Curadoria")
 *   - roving tabindex: só o radio marcado entra na ordem do Tab
 *   - setas movem o foco E selecionam (selection follows focus), com wrap
 *   - Home/End saltam para o primeiro/último e selecionam
 *   - clique continua selecionando (sem regressão)
 *   - disabled: teclado não seleciona
 */
import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MagicUpCurationStatus } from "@/components/magic-up/MagicUpCurationStatus";
import {
  CURATION_STATUSES,
  type MagicUpCurationStatus as CurationValue,
} from "@/pages/magic-up/magicUpStrategy";

const lastStatus = CURATION_STATUSES[CURATION_STATUSES.length - 1];

function labelFor(value: CurationValue): string {
  return CURATION_STATUSES.find((status) => status.value === value)?.label ?? value;
}

const radioName = (value: CurationValue) => `Definir curadoria como ${labelFor(value)}`;

const radios = () => screen.getAllByRole("radio");
const checkedRadio = () => radios().find((r) => r.getAttribute("aria-checked") === "true");

/** Harness controlado: exercita a seleção real (aria-checked acompanha onChange). */
function renderStatus({
  value = "draft",
  disabled = false,
}: { value?: CurationValue; disabled?: boolean } = {}) {
  const onChange = vi.fn();
  function Harness() {
    const [current, setCurrent] = useState<CurationValue>(value);
    return (
      <MagicUpCurationStatus
        value={current}
        disabled={disabled}
        onChange={(next) => {
          onChange(next);
          setCurrent(next);
        }}
      />
    );
  }
  return { ...render(<Harness />), onChange, user: userEvent.setup() };
}

describe("MagicUpCurationStatus — radiogroup acessível", () => {
  it("expõe radiogroup com nome e mantém apenas o radio marcado tabbable (roving tabindex)", () => {
    renderStatus({ value: "good" });

    const group = screen.getByRole("radiogroup", { name: "Curadoria" });
    // O container não é mais uma parada de Tab — quem recebe Tab são os radios.
    expect(group).not.toHaveAttribute("tabindex");

    expect(radios()).toHaveLength(CURATION_STATUSES.length);
    const tabbable = radios().filter((radio) => radio.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAccessibleName(radioName("good"));
    expect(checkedRadio()).toBe(tabbable[0]);

    const unchecked = radios().filter((radio) => radio.getAttribute("aria-checked") === "false");
    expect(unchecked).not.toHaveLength(0);
    for (const radio of unchecked) expect(radio).toHaveAttribute("tabindex", "-1");
  });

  it("Tab entra direto no radio marcado, sem parar no container", async () => {
    const { user } = renderStatus({ value: "internal-approved" });

    await user.tab();
    expect(document.activeElement).toHaveAccessibleName(radioName("internal-approved"));
    expect(document.activeElement).not.toHaveAttribute("role", "radiogroup");
  });

  it("setas para frente movem o foco e selecionam o próximo item", async () => {
    const { user, onChange } = renderStatus({ value: "draft" });

    await user.tab();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenLastCalledWith("good");
    expect(document.activeElement).toHaveAccessibleName(radioName("good"));
    expect(checkedRadio()).toHaveAccessibleName(radioName("good"));

    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith("favorite");
    expect(document.activeElement).toHaveAccessibleName(radioName("favorite"));
  });

  it("setas para trás movem o foco e selecionam o item anterior", async () => {
    const { user, onChange } = renderStatus({ value: "sent-to-client" });

    await user.tab();
    await user.keyboard("{ArrowLeft}");

    expect(onChange).toHaveBeenLastCalledWith("internal-approved");
    expect(document.activeElement).toHaveAccessibleName(radioName("internal-approved"));

    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenLastCalledWith("favorite");
    expect(document.activeElement).toHaveAccessibleName(radioName("favorite"));
  });

  it("dá a volta nas pontas (APG radiogroup): último → primeiro e primeiro → último", async () => {
    const { user } = renderStatus({ value: lastStatus.value });

    await user.tab();
    expect(document.activeElement).toHaveAccessibleName(radioName(lastStatus.value));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toHaveAccessibleName(radioName("draft"));

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toHaveAccessibleName(radioName(lastStatus.value));
    expect(checkedRadio()).toHaveAccessibleName(radioName(lastStatus.value));
  });

  it("Home e End pulam para o primeiro/último e selecionam", async () => {
    const { user, onChange } = renderStatus({ value: "favorite" });

    await user.tab();
    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith(lastStatus.value);
    expect(document.activeElement).toHaveAccessibleName(radioName(lastStatus.value));

    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("draft");
    expect(document.activeElement).toHaveAccessibleName("Definir curadoria como Rascunho");
    expect(checkedRadio()).toHaveAccessibleName("Definir curadoria como Rascunho");
  });

  it("continua selecionando por clique/toque (sem regressão do mouse)", async () => {
    const { user, onChange } = renderStatus({ value: "draft" });

    await user.click(screen.getByRole("radio", { name: radioName("client-approved") }));
    expect(onChange).toHaveBeenLastCalledWith("client-approved");
    expect(checkedRadio()).toHaveAccessibleName(radioName("client-approved"));
  });

  it("com disabled o teclado não seleciona nada", () => {
    const onChange = vi.fn();
    render(<MagicUpCurationStatus value="draft" disabled onChange={onChange} />);

    expect(radios()).not.toHaveLength(0);
    for (const radio of radios()) expect(radio).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "Curadoria" }), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "Curadoria" }), { key: "End" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
